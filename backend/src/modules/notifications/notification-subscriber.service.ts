import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WorkOrderStatusChangedEvent } from '../work-orders/events/work-order-status-changed.event.js';
import { NotificationsService } from './notifications.service.js';
import { PrismaService } from '../common/prisma.service.js';
import {
  WorkOrderStatus,
  NotificationChannel,
} from '../../generated/prisma/enums.js';
import { WORK_ORDER_NUMBER_LENGTH } from '../common/constants.js';

@Injectable()
export class NotificationSubscriber {
  private readonly logger = new Logger(NotificationSubscriber.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  @OnEvent(WorkOrderStatusChangedEvent.name)
  async handleStatusChange(event: WorkOrderStatusChangedEvent): Promise<void> {
    try {
      await this.notifyStatusChange(event.order, event.fromStatus, event.toStatus);
    } catch (err) {
      this.logger.error(
        `Failed to send notification for order ${event.orderId}: ${(err as Error).message}`,
      );
    }
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
          await this.notifyTechnician(order.id, order.technicianId, 'order_assigned');
        }
        break;

      case WorkOrderStatus.ACCEPTED:
        if (order.technicianId) {
          await this.notifyTechnician(order.id, order.technicianId, 'status_change', {
            newStatus: 'ACCEPTED',
          });
        }
        break;

      case WorkOrderStatus.EN_ROUTE:
        await this.notifyCustomerAuto(order.id, order.customerId, 'en_route');
        break;

      case WorkOrderStatus.IN_PROGRESS:
        if (order.technicianId) {
          await this.notifyTechnician(order.id, order.technicianId, 'status_change', {
            newStatus: 'IN_PROGRESS',
          });
        }
        break;

      case WorkOrderStatus.COMPLETED:
        await this.notifyCustomer(order.id, order.customerId, null, 'rating_request', {
          ratingUrl: `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/rate/${order.id}`,
        });
        break;

      case WorkOrderStatus.RESCHEDULED:
        if (order.technicianId) {
          await this.notifyTechnician(order.id, order.technicianId, 'status_change', {
            newStatus: 'RESCHEDULED',
          });
        }
        break;

      case WorkOrderStatus.ISSUE:
      case WorkOrderStatus.ESCALATED:
        await this.notifyDealer(
          order.id,
          toStatus === WorkOrderStatus.ESCALATED ? 'issue_escalated' : 'status_change',
          { newStatus: toStatus },
        );
        break;
    }
  }
}
