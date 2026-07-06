import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import {
  ScopingService,
  type AuthenticatedUser,
} from '../common/services/scoping.service.js';
import { StateMachineService } from './services/state-machine.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import {
  WorkOrderStatus,
  NotificationChannel,
} from '../../generated/prisma/enums.js';
import { CreateWorkOrderDto } from './dto/create-work-order.dto.js';
import { AssignWorkOrderDto } from './dto/assign-work-order.dto.js';
import { RescheduleWorkOrderDto } from './dto/reschedule-work-order.dto.js';
import type { WorkOrderQueryDto } from './dto/work-order-query.dto.js';

interface TransitionOpts {
  id: string;
  toStatus: WorkOrderStatus;
  user: AuthenticatedUser;
  note?: string | null;
  extraData?: Record<string, unknown>;
}

@Injectable()
export class WorkOrdersService {
  private readonly logger = new Logger(WorkOrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopingService: ScopingService,
    private readonly stateMachine: StateMachineService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateWorkOrderDto, user: AuthenticatedUser) {
    if (!user.profileId) {
      throw new ForbiddenException('User has no dealer profile');
    }

    return this.prisma.workOrder.create({
      data: {
        dealerId: user.profileId,
        customerId: dto.customerId,
        deviceId: dto.deviceId,
        subDistrict: dto.subDistrict,
        department: dto.department ?? null,
        priority: dto.priority ?? 0,
        appointmentDate: dto.appointmentDate ?? null,
        slaDeadline: dto.slaDeadline ?? null,
      },
      include: { customer: true, device: true },
    });
  }

  async findAll(user: AuthenticatedUser, query?: WorkOrderQueryDto) {
    const scope = await this.scopingService.applyWorkOrderScope(user);

    const where: Record<string, unknown> = { ...scope };
    if (query?.status) where.status = query.status;
    if (query?.subDistrict) where.subDistrict = query.subDistrict;
    if (query?.department) where.department = query.department;
    if (query?.priority !== undefined) where.priority = query.priority;

    return this.prisma.workOrder.findMany({
      where,
      include: { customer: true, device: true, technician: true },
      orderBy: { createdAt: 'desc' },
      take: query?.limit ?? 50,
      skip: query?.page ? (query.page - 1) * (query.limit ?? 50) : 0,
    });
  }

  async findById(id: string, user: AuthenticatedUser) {
    const scope = await this.scopingService.applyWorkOrderScope(user);

    const order = await this.prisma.workOrder.findFirst({
      where: { id, ...scope },
      include: {
        customer: true,
        device: true,
        technician: true,
        statusHistory: { orderBy: { changedAt: 'desc' } },
      },
    });

    if (!order) {
      throw new NotFoundException('Work order not found');
    }

    return order;
  }

  async transition({ id, toStatus, user, note, extraData }: TransitionOpts) {
    const order = await this.findById(id, user);

    this.stateMachine.validate(order.status, toStatus);

    const isDecline =
      order.status === WorkOrderStatus.ASSIGNED &&
      toStatus === WorkOrderStatus.REQUESTED;

    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.workOrder.findUnique({ where: { id } });
      if (!current || current.status !== order.status) {
        throw new ConflictException(
          'Work order was modified by another request',
        );
      }

      await tx.workOrderStatusHistory.create({
        data: {
          workOrderId: id,
          fromStatus: current.status,
          toStatus,
          changedByUserId: user.id,
          note: note ?? null,
        },
      });

      return tx.workOrder.update({
        where: { id },
        data: {
          status: toStatus,
          technicianId: isDecline ? null : undefined,
          ...extraData,
        },
        include: { customer: true, device: true, technician: true },
      });
    });

    await this.notifyStatusChange(updated, order.status, toStatus);

    return updated;
  }

  private async notifyStatusChange(
    order: {
      id: string;
      status: WorkOrderStatus;
      customerId: string;
      dealerId: string;
      technicianId: string | null;
    },
    fromStatus: WorkOrderStatus,
    toStatus: WorkOrderStatus,
  ): Promise<void> {
    try {
      switch (toStatus) {
        case WorkOrderStatus.ASSIGNED:
          if (order.technicianId) {
            const tech = await this.prisma.technician.findUnique({
              where: { id: order.technicianId },
              select: { userId: true },
            });
            if (tech) {
              await this.notificationsService.enqueue(
                order.id,
                NotificationChannel.LINE,
                'order_assigned',
                { workOrderNumber: order.id.slice(0, 8) },
                tech.userId,
              );
            }
          }
          break;

        case WorkOrderStatus.ACCEPTED:
          if (order.technicianId) {
            const tech = await this.prisma.technician.findUnique({
              where: { id: order.technicianId },
              select: { userId: true },
            });
            if (tech) {
              await this.notificationsService.enqueue(
                order.id,
                NotificationChannel.LINE,
                'status_change',
                {
                  workOrderNumber: order.id.slice(0, 8),
                  newStatus: 'ACCEPTED',
                },
                tech.userId,
              );
            }
          }
          break;

        case WorkOrderStatus.EN_ROUTE: {
          const customer = await this.prisma.customer.findUnique({
            where: { id: order.customerId },
            select: { id: true, email: true, lineUserId: true },
          });
          if (customer) {
            if (customer.lineUserId) {
              await this.notificationsService.enqueue(
                order.id,
                NotificationChannel.LINE,
                'en_route',
                { workOrderNumber: order.id.slice(0, 8) },
                undefined,
                customer.id,
              );
            } else if (customer.email) {
              await this.notificationsService.enqueue(
                order.id,
                NotificationChannel.EMAIL,
                'en_route',
                { workOrderNumber: order.id.slice(0, 8) },
                undefined,
                customer.id,
              );
            }
          }
          break;
        }

        case WorkOrderStatus.IN_PROGRESS:
          if (order.technicianId) {
            const tech = await this.prisma.technician.findUnique({
              where: { id: order.technicianId },
              select: { userId: true },
            });
            if (tech) {
              await this.notificationsService.enqueue(
                order.id,
                NotificationChannel.LINE,
                'status_change',
                {
                  workOrderNumber: order.id.slice(0, 8),
                  newStatus: 'IN_PROGRESS',
                },
                tech.userId,
              );
            }
          }
          break;

        case WorkOrderStatus.COMPLETED: {
          const cust = await this.prisma.customer.findUnique({
            where: { id: order.customerId },
            select: { id: true, email: true },
          });
          if (cust?.email) {
            await this.notificationsService.enqueue(
              order.id,
              NotificationChannel.EMAIL,
              'rating_request',
              {
                workOrderNumber: order.id.slice(0, 8),
                ratingUrl: `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/rate/${order.id}`,
              },
              undefined,
              cust.id,
            );
          }
          break;
        }

        case WorkOrderStatus.RESCHEDULED:
          if (order.technicianId) {
            const tech = await this.prisma.technician.findUnique({
              where: { id: order.technicianId },
              select: { userId: true },
            });
            if (tech) {
              await this.notificationsService.enqueue(
                order.id,
                NotificationChannel.LINE,
                'status_change',
                {
                  workOrderNumber: order.id.slice(0, 8),
                  newStatus: 'RESCHEDULED',
                },
                tech.userId,
              );
            }
          }
          break;

        case WorkOrderStatus.ISSUE:
        case WorkOrderStatus.ESCALATED: {
          const orderWithDealer = await this.prisma.workOrder.findUnique({
            where: { id: order.id },
            select: {
              dealer: { select: { userId: true } },
            },
          });
          if (orderWithDealer?.dealer.userId) {
            await this.notificationsService.enqueue(
              order.id,
              NotificationChannel.EMAIL,
              toStatus === WorkOrderStatus.ESCALATED
                ? 'issue_escalated'
                : 'status_change',
              {
                workOrderNumber: order.id.slice(0, 8),
                newStatus: toStatus,
              },
              orderWithDealer.dealer.userId,
            );
          }
          break;
        }
      }
    } catch (err) {
      this.logger.warn(
        `Failed to enqueue notification: ${(err as Error).message}`,
      );
    }
  }

  async assign(id: string, dto: AssignWorkOrderDto, user: AuthenticatedUser) {
    const order = await this.findById(id, user);

    this.stateMachine.validate(order.status, WorkOrderStatus.ASSIGNED);

    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.workOrder.findUnique({ where: { id } });
      if (!current || current.status !== order.status) {
        throw new ConflictException(
          'Work order was modified by another request',
        );
      }

      await tx.workOrderStatusHistory.create({
        data: {
          workOrderId: id,
          fromStatus: current.status,
          toStatus: WorkOrderStatus.ASSIGNED,
          changedByUserId: user.id,
        },
      });

      return tx.workOrder.update({
        where: { id },
        data: {
          status: WorkOrderStatus.ASSIGNED,
          technicianId: dto.technicianId,
        },
        include: { customer: true, device: true, technician: true },
      });
    });

    await this.notifyStatusChange(
      updated,
      order.status,
      WorkOrderStatus.ASSIGNED,
    );

    return updated;
  }

  accept(id: string, user: AuthenticatedUser) {
    return this.transition({ id, toStatus: WorkOrderStatus.ACCEPTED, user });
  }

  decline(id: string, user: AuthenticatedUser, note?: string | null) {
    return this.transition({
      id,
      toStatus: WorkOrderStatus.REQUESTED,
      user,
      note,
    });
  }

  reschedule(id: string, dto: RescheduleWorkOrderDto, user: AuthenticatedUser) {
    return this.transition({
      id,
      toStatus: WorkOrderStatus.RESCHEDULED,
      user,
      extraData: { appointmentDate: dto.appointmentDate },
    });
  }

  startTravel(id: string, user: AuthenticatedUser) {
    return this.transition({ id, toStatus: WorkOrderStatus.EN_ROUTE, user });
  }

  startWork(id: string, user: AuthenticatedUser) {
    return this.transition({ id, toStatus: WorkOrderStatus.IN_PROGRESS, user });
  }

  reportIssue(id: string, user: AuthenticatedUser, note?: string | null) {
    return this.transition({ id, toStatus: WorkOrderStatus.ISSUE, user, note });
  }

  resolveIssue(id: string, user: AuthenticatedUser) {
    return this.transition({ id, toStatus: WorkOrderStatus.IN_PROGRESS, user });
  }

  escalate(id: string, user: AuthenticatedUser, note?: string | null) {
    return this.transition({
      id,
      toStatus: WorkOrderStatus.ESCALATED,
      user,
      note,
    });
  }

  complete(id: string, user: AuthenticatedUser) {
    return this.transition({ id, toStatus: WorkOrderStatus.COMPLETED, user });
  }

  async cancel(id: string, user: AuthenticatedUser, note?: string | null) {
    await this.findById(id, user);
    return this.transition({
      id,
      toStatus: WorkOrderStatus.CANCELLED,
      user,
      note,
    });
  }
}
