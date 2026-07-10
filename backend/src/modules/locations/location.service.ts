import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { LocationCacheService } from './location-cache.service.js';
import { RoomManagerService } from './services/room-manager.service.js';
import { WorkOrderStatus } from '../../generated/prisma/enums.js';
import type { WsAuthenticatedUser } from './services/ws-auth.service.js';
import type { RlsUser } from '../common/services/rls-context.js';

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly locationCache: LocationCacheService,
    private readonly roomManager: RoomManagerService,
  ) {}

  async syncLastPositionToDb(technicianId: string): Promise<void> {
    try {
      const pos = await this.locationCache.getPosition(technicianId);
      if (pos) {
        await this.prisma.technician.update({
          where: { id: technicianId },
          data: {
            lastLat: pos.lat,
            lastLng: pos.lng,
            lastLocationAt: new Date(pos.timestamp),
          },
        });
      }
    } catch (syncError) {
      this.logger.warn(
        `Failed to sync position for technician ${technicianId}: ${(syncError as Error).message}`,
        (syncError as Error).stack,
      );
    }
  }

  haversineDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  async buildRlsUser(user: WsAuthenticatedUser): Promise<RlsUser> {
    const rlsUser: RlsUser = {
      userId: user.id,
      role: user.role,
    };

    if (user.role === 'CUSTOMER') {
      rlsUser.customerId = user.id;
    } else if (user.profileId) {
      rlsUser.profileId = user.profileId;
    }

    if (user.role === 'COORDINATOR') {
      const dept = await this.resolveCoordinatorDepartment(user.id);
      if (dept) rlsUser.department = dept;
    }

    return rlsUser;
  }

  async resolveCoordinatorDepartment(
    userId: string,
  ): Promise<string | undefined> {
    try {
      const rows = await this.prisma.raw.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(
          `SELECT set_config('app.user_id', $1, true)`,
          [userId],
        );
        await tx.$executeRawUnsafe(
          `SELECT set_config('app.user_role', 'COORDINATOR', true)`,
        );
        return tx.$queryRawUnsafe<{ department: string }[]>(
          'SELECT department FROM coordinators WHERE user_id = $1::uuid LIMIT 1',
          [userId],
        );
      });
      return rows[0]?.department;
    } catch (deptError) {
      this.logger.warn(
        `Failed to resolve department for coordinator ${userId}: ${(deptError as Error).message}`,
        (deptError as Error).stack,
      );
      return undefined;
    }
  }

  async autoSubscribeRooms(user: WsAuthenticatedUser): Promise<string[]> {
    let orderIds: string[] = [];

    switch (user.role) {
      case 'TECHNICIAN':
        if (user.profileId) {
          const active = await this.prisma.workOrder.findMany({
            where: {
              technicianId: user.profileId,
              status: {
                notIn: [WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED],
              },
            },
            select: { id: true },
          });
          orderIds = active.map((o: { id: string }) => o.id);
        }
        break;
      case 'CUSTOMER': {
        const orders = await this.prisma.workOrder.findMany({
          where: { customerId: user.id },
          select: { id: true },
        });
        orderIds = orders.map((o: { id: string }) => o.id);
        break;
      }
      case 'COORDINATOR': {
        const coordinator = await this.prisma.coordinator.findUnique({
          where: { userId: user.id },
          select: { department: true },
        });
        if (coordinator?.department) {
          const orders = await this.prisma.workOrder.findMany({
            where: {
              department: coordinator.department,
              status: {
                notIn: [WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED],
              },
            },
            select: { id: true },
          });
          orderIds = orders.map((o: { id: string }) => o.id);
        }
        break;
      }
      case 'HQ': {
        const orders = await this.prisma.workOrder.findMany({
          where: {
            status: {
              notIn: [WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED],
            },
          },
          select: { id: true },
          take: 50,
        });
        orderIds = orders.map((o: { id: string }) => o.id);
        break;
      }
    }

    return orderIds;
  }

  async validateRoomAccess(
    user: WsAuthenticatedUser,
    room: string,
  ): Promise<boolean> {
    const orderMatch = room.match(/^room:order:(.+)$/);
    if (!orderMatch) return false;

    const orderId = orderMatch[1];

    switch (user.role) {
      case 'CUSTOMER': {
        const order = await this.prisma.workOrder.findFirst({
          where: { id: orderId, customerId: user.id },
        });
        return !!order;
      }
      case 'COORDINATOR': {
        const [order, coordinator] = await Promise.all([
          this.prisma.workOrder.findUnique({
            where: { id: orderId },
            select: { department: true },
          }),
          this.prisma.coordinator.findUnique({
            where: { userId: user.id },
            select: { department: true },
          }),
        ]);
        return (
          !!order &&
          !!coordinator &&
          order.department === coordinator.department
        );
      }
      case 'HQ':
        return true;
      default:
        return false;
    }
  }
}
