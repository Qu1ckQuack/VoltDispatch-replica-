import { Injectable } from '@nestjs/common';
import {
  NotFoundAppException,
  ConflictAppException,
  ForbiddenAppException,
} from '../common/errors/app-exception.js';
import { ErrorCodes } from '../common/errors/error-codes.js';
import { PrismaService } from '../common/prisma.service.js';
import { CreateDeviceDto } from './dto/create-device.dto.js';
import { UpdateDeviceDto } from './dto/update-device.dto.js';
import type { AuthenticatedUser } from '../common/services/scoping.service.js';
import { UserRole, WorkOrderStatus } from '../../generated/prisma/enums.js';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertDeviceAccess(
    id: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    if (user.role === UserRole.HQ) return;
    const device = await this.prisma.device.findUnique({
      where: { id },
      select: { dealerId: true },
    });
    if (!device) throw new NotFoundAppException('Device');
    if (device.dealerId !== user.profileId) {
      throw new ForbiddenAppException('Access denied');
    }
  }

  async create(dto: CreateDeviceDto, dealerId: string) {
    const existing = await this.prisma.device.findUnique({
      where: { serialNumber: dto.serialNumber },
    });
    if (existing)
      throw new ConflictAppException(
        'Serial number already registered',
        ErrorCodes.CONFLICT_DUPLICATE,
      );

    return this.prisma.device.create({
      data: {
        dealerId,
        model: dto.model,
        serialNumber: dto.serialNumber,
        ipAddress: dto.ipAddress,
        metadata: dto.metadata as object,
      },
      include: { dealer: true },
    });
  }

  async findAll(dealerId?: string) {
    const where = dealerId ? { dealerId } : {};
    return this.prisma.device.findMany({
      where,
      include: { dealer: true, _count: { select: { workOrders: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, user?: AuthenticatedUser) {
    const device = await this.prisma.device.findUnique({
      where: { id },
      include: { dealer: true },
    });
    if (!device) throw new NotFoundAppException('Device');
    if (user) await this.assertDeviceAccess(id, user);
    return device;
  }

  async update(id: string, dto: UpdateDeviceDto, user?: AuthenticatedUser) {
    if (user) await this.assertDeviceAccess(id, user);
    const data: Record<string, unknown> = {};
    if (dto.model !== undefined) data.model = dto.model;
    if (dto.serialNumber !== undefined) data.serialNumber = dto.serialNumber;
    if (dto.ipAddress !== undefined) data.ipAddress = dto.ipAddress;
    if (dto.metadata !== undefined) data.metadata = dto.metadata;

    return this.prisma.device.update({ where: { id }, data });
  }

  async remove(id: string, user?: AuthenticatedUser) {
    if (user) await this.assertDeviceAccess(id, user);

    const activeOrders = await this.prisma.workOrder.count({
      where: {
        deviceId: id,
        status: {
          notIn: [WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED],
        },
      },
    });

    if (activeOrders > 0) {
      throw new ConflictAppException(
        'Cannot delete device with active work orders',
        ErrorCodes.CONFLICT_ACTIVE_ORDERS,
      );
    }

    await this.prisma.device.delete({ where: { id } });
    return { deleted: true };
  }
}
