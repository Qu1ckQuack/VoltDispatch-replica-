import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../common/prisma.service.js';
import {
  ScopingService,
  type AuthenticatedUser,
} from '../common/services/scoping.service.js';
import { StateMachineService } from './services/state-machine.service.js';
import { RedisService } from '../redis/redis.service.js';
import { WorkOrderStatus } from '../../generated/prisma/enums.js';
import { CreateWorkOrderDto } from './dto/create-work-order.dto.js';
import { AssignWorkOrderDto } from './dto/assign-work-order.dto.js';
import { RescheduleWorkOrderDto } from './dto/reschedule-work-order.dto.js';
import type { WorkOrderQueryDto } from './dto/work-order-query.dto.js';
import { WorkOrderStatusChangedEvent } from './events/work-order-status-changed.event.js';

import { DEFAULT_PAGE_LIMIT } from '../common/constants.js';

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
    private readonly eventEmitter: EventEmitter2,
    private readonly redis: RedisService,
  ) {}

  create(dto: CreateWorkOrderDto, user: AuthenticatedUser) {
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

    const page = query?.page ?? 1;
    const limit = query?.limit ?? DEFAULT_PAGE_LIMIT;

    const [data, total] = await Promise.all([
      this.prisma.workOrder.findMany({
        where,
        include: { customer: true, device: true, technician: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      this.prisma.workOrder.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
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

    this.eventEmitter.emit(
      WorkOrderStatusChangedEvent.name,
      new WorkOrderStatusChangedEvent(id, order.status, toStatus, updated),
    );

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

    this.eventEmitter.emit(
      WorkOrderStatusChangedEvent.name,
      new WorkOrderStatusChangedEvent(
        id,
        order.status,
        WorkOrderStatus.ASSIGNED,
        updated,
      ),
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
