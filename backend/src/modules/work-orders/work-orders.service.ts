import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { ScopingService, type AuthenticatedUser } from '../common/services/scoping.service.js';
import { StateMachineService } from './services/state-machine.service.js';
import { WorkOrderStatus } from '../../generated/prisma/enums.js';
import { CreateWorkOrderDto } from './dto/create-work-order.dto.js';
import { AssignWorkOrderDto } from './dto/assign-work-order.dto.js';
import { RescheduleWorkOrderDto } from './dto/reschedule-work-order.dto.js';
import type { WorkOrderQueryDto } from './dto/work-order-query.dto.js';

interface TransitionOpts {
  id: string;
  toStatus: WorkOrderStatus;
  user: AuthenticatedUser;
  note?: string | null;
}

@Injectable()
export class WorkOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopingService: ScopingService,
    private readonly stateMachine: StateMachineService,
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
    const order = await this.prisma.workOrder.findUnique({
      where: { id },
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

    const scope = await this.scopingService.applyWorkOrderScope(user);
    if (Object.keys(scope).length > 0) {
      const match = Object.entries(scope).every(
        ([key, value]) => (order as Record<string, unknown>)[key] === value,
      );
      if (!match) {
        throw new NotFoundException('Work order not found');
      }
    }

    return order;
  }

  async transition({ id, toStatus, user, note }: TransitionOpts) {
    const order = await this.findById(id, user);

    this.stateMachine.validate(order.status, toStatus);

    const isDecline = order.status === WorkOrderStatus.ASSIGNED && toStatus === WorkOrderStatus.REQUESTED;

    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.workOrder.findUnique({ where: { id } });
      if (!current || current.status !== order.status) {
        throw new ConflictException('Work order was modified by another request');
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
        },
        include: { customer: true, device: true, technician: true },
      });
    });

    return updated;
  }

  async assign(id: string, dto: AssignWorkOrderDto, user: AuthenticatedUser) {
    const order = await this.findById(id, user);

    this.stateMachine.validate(order.status, WorkOrderStatus.ASSIGNED);

    return this.prisma.$transaction(async (tx) => {
      const current = await tx.workOrder.findUnique({ where: { id } });
      if (!current || current.status !== order.status) {
        throw new ConflictException('Work order was modified by another request');
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
        data: { status: WorkOrderStatus.ASSIGNED, technicianId: dto.technicianId },
        include: { customer: true, device: true, technician: true },
      });
    });
  }

  accept(id: string, user: AuthenticatedUser) {
    return this.transition({ id, toStatus: WorkOrderStatus.ACCEPTED, user });
  }

  decline(id: string, user: AuthenticatedUser, note?: string | null) {
    return this.transition({ id, toStatus: WorkOrderStatus.REQUESTED, user, note });
  }

  reschedule(id: string, dto: RescheduleWorkOrderDto, user: AuthenticatedUser) {
    return this.prisma.$transaction(async (tx) => {
      await this.findById(id, user);

      this.stateMachine.validate(WorkOrderStatus.ACCEPTED, WorkOrderStatus.RESCHEDULED);

      await tx.workOrderStatusHistory.create({
        data: {
          workOrderId: id,
          fromStatus: WorkOrderStatus.ACCEPTED,
          toStatus: WorkOrderStatus.RESCHEDULED,
          changedByUserId: user.id,
        },
      });

      return tx.workOrder.update({
        where: { id },
        data: { status: WorkOrderStatus.RESCHEDULED, appointmentDate: dto.appointmentDate },
      });
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
    return this.transition({ id, toStatus: WorkOrderStatus.ESCALATED, user, note });
  }

  complete(id: string, user: AuthenticatedUser) {
    return this.transition({ id, toStatus: WorkOrderStatus.COMPLETED, user });
  }

  async cancel(id: string, user: AuthenticatedUser, note?: string | null) {
    await this.findById(id, user);
    return this.transition({ id, toStatus: WorkOrderStatus.CANCELLED, user, note });
  }
}
