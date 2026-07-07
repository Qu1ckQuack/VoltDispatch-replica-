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
import { RedisService } from '../redis/redis.service.js';
import {
  WorkOrderStatus,
  NotificationChannel,
} from '../../generated/prisma/enums.js';
import { CreateWorkOrderDto } from './dto/create-work-order.dto.js';
import { AssignWorkOrderDto } from './dto/assign-work-order.dto.js';
import { RescheduleWorkOrderDto } from './dto/reschedule-work-order.dto.js';
import type { WorkOrderQueryDto } from './dto/work-order-query.dto.js';

import {
  WORK_ORDER_NUMBER_LENGTH,
  DEFAULT_PAGE_LIMIT,
} from '../common/constants.js';

const ACTIVITIES_CHANNEL = 'hq:activities';

const CANCEL_RULES: Partial<Record<WorkOrderStatus, string[]>> = {
  [WorkOrderStatus.REQUESTED]: ['DEALER', 'HQ'],
  [WorkOrderStatus.ASSIGNED]: ['DEALER', 'HQ', 'TECHNICIAN'],
  [WorkOrderStatus.ACCEPTED]: ['TECHNICIAN', 'CUSTOMER'],
};

interface TransitionOpts {
  id: string;
  toStatus: WorkOrderStatus;
  user: AuthenticatedUser;
  note?: string | null;
  extraData?: Record<string, unknown>;
  existingOrder?: {
    id: string;
    status: WorkOrderStatus;
    customerId: string;
    technicianId: string | null;
  };
}

@Injectable()
export class WorkOrdersService {
  private readonly logger = new Logger(WorkOrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopingService: ScopingService,
    private readonly stateMachine: StateMachineService,
    private readonly notificationsService: NotificationsService,
    private readonly redis: RedisService,
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
      take: query?.limit ?? DEFAULT_PAGE_LIMIT,
      skip: query?.page
        ? (query.page - 1) * (query.limit ?? DEFAULT_PAGE_LIMIT)
        : 0,
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

  async transition({
    id,
    toStatus,
    user,
    note,
    extraData,
    existingOrder,
  }: TransitionOpts) {
    const order = existingOrder ?? (await this.findById(id, user));

    this.stateMachine.validate(order.status, toStatus);

    const isDecline =
      order.status === WorkOrderStatus.ASSIGNED &&
      toStatus === WorkOrderStatus.REQUESTED;

    const isComplete = toStatus === WorkOrderStatus.COMPLETED;

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
          completedAt: isComplete ? new Date() : undefined,
          ...extraData,
        },
        include: { customer: true, device: true, technician: true },
      });
    });

    await this.notifyStatusChange(updated, order.status, toStatus);

    await this.redis.publish(
      ACTIVITIES_CHANNEL,
      JSON.stringify({
        type: 'status_change',
        orderId: updated.id,
        fromStatus: order.status,
        toStatus: updated.status,
        changedBy: user.email,
        timestamp: new Date().toISOString(),
      }),
    );

    return updated;
  }

  private async notifyTechnician(
    orderId: string,
    technicianId: string,
    type: string,
    extraPayload?: Record<string, unknown>,
  ): Promise<void> {
    const tech = await this.prisma.technician.findUnique({
      where: { id: technicianId },
      select: { userId: true },
    });
    if (!tech) return;
    await this.notificationsService.enqueue(
      orderId,
      NotificationChannel.LINE,
      type,
      {
        workOrderNumber: orderId.slice(0, WORK_ORDER_NUMBER_LENGTH),
        ...extraPayload,
      },
      tech.userId,
    );
  }

  private async notifyCustomer(
    orderId: string,
    customerId: string,
    channelPref: NotificationChannel | null,
    type: string,
    extraPayload?: Record<string, unknown>,
  ): Promise<void> {
    const channel = channelPref ?? NotificationChannel.EMAIL;
    await this.notificationsService.enqueue(
      orderId,
      channel,
      type,
      {
        workOrderNumber: orderId.slice(0, WORK_ORDER_NUMBER_LENGTH),
        ...extraPayload,
      },
      undefined,
      customerId,
    );
  }

  private async notifyCustomerAuto(
    orderId: string,
    customerId: string,
    type: string,
    extraPayload?: Record<string, unknown>,
  ): Promise<void> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, email: true, lineUserId: true },
    });
    if (!customer) return;
    if (customer.lineUserId) {
      await this.notifyCustomer(
        orderId,
        customer.id,
        NotificationChannel.LINE,
        type,
        extraPayload,
      );
    } else if (customer.email) {
      await this.notifyCustomer(
        orderId,
        customer.id,
        NotificationChannel.EMAIL,
        type,
        extraPayload,
      );
    }
  }

  private async notifyDealer(
    orderId: string,
    type: string,
    extraPayload?: Record<string, unknown>,
  ): Promise<void> {
    const orderWithDealer = await this.prisma.workOrder.findUnique({
      where: { id: orderId },
      select: { dealer: { select: { userId: true } } },
    });
    if (!orderWithDealer?.dealer.userId) return;
    await this.notificationsService.enqueue(
      orderId,
      NotificationChannel.EMAIL,
      type,
      {
        workOrderNumber: orderId.slice(0, WORK_ORDER_NUMBER_LENGTH),
        ...extraPayload,
      },
      orderWithDealer.dealer.userId,
    );
  }

  private async notifyStatusChange(
    order: {
      id: string;
      status: WorkOrderStatus;
      customerId: string;
      dealerId: string;
      technicianId: string | null;
    },
    _fromStatus: WorkOrderStatus,
    toStatus: WorkOrderStatus,
  ): Promise<void> {
    switch (toStatus) {
      case WorkOrderStatus.ASSIGNED:
        if (order.technicianId) {
          await this.notifyTechnician(
            order.id,
            order.technicianId,
            'order_assigned',
          );
        }
        break;

      case WorkOrderStatus.ACCEPTED:
        if (order.technicianId) {
          await this.notifyTechnician(
            order.id,
            order.technicianId,
            'status_change',
            { newStatus: 'ACCEPTED' },
          );
        }
        break;

      case WorkOrderStatus.EN_ROUTE:
        await this.notifyCustomerAuto(order.id, order.customerId, 'en_route');
        break;

      case WorkOrderStatus.IN_PROGRESS:
        if (order.technicianId) {
          await this.notifyTechnician(
            order.id,
            order.technicianId,
            'status_change',
            { newStatus: 'IN_PROGRESS' },
          );
        }
        break;

      case WorkOrderStatus.COMPLETED:
        await this.notifyCustomer(
          order.id,
          order.customerId,
          null,
          'rating_request',
          {
            ratingUrl: `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/rate/${order.id}`,
          },
        );
        break;

      case WorkOrderStatus.RESCHEDULED:
        if (order.technicianId) {
          await this.notifyTechnician(
            order.id,
            order.technicianId,
            'status_change',
            { newStatus: 'RESCHEDULED' },
          );
        }
        break;

      case WorkOrderStatus.ISSUE:
      case WorkOrderStatus.ESCALATED:
        await this.notifyDealer(
          order.id,
          toStatus === WorkOrderStatus.ESCALATED
            ? 'issue_escalated'
            : 'status_change',
          { newStatus: toStatus },
        );
        break;
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
    const order = await this.findById(id, user);

    const allowedRoles = CANCEL_RULES[order.status];
    if (!allowedRoles || !allowedRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Cannot cancel work order in status ${order.status} as role ${user.role}`,
      );
    }

    if (user.role === 'CUSTOMER' && order.customerId !== user.id) {
      throw new ForbiddenException('You can only cancel your own work orders');
    }

    if (
      user.role === 'TECHNICIAN' &&
      order.technicianId &&
      order.technicianId !== user.profileId
    ) {
      throw new ForbiddenException(
        'You can only cancel your own assigned work orders',
      );
    }

    return this.transition({
      id,
      toStatus: WorkOrderStatus.CANCELLED,
      user,
      note,
      existingOrder: order,
    });
  }
}
