import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Queue } from 'bullmq';
import { InjectQueue } from '../bullmq/helpers.js';
import {
  NOTIFICATION_QUEUE_NAME,
  type NotificationJobData,
} from '../bullmq/queues/notification.queue.js';
import { PrismaService } from '../common/prisma.service.js';
import type { NotificationAdapter } from './adapters/notification-adapter.interface.js';
import { ResendAdapter } from './adapters/resend.adapter.js';
import { LineAdapter } from './adapters/line.adapter.js';
import { DEFAULT_PAGE_LIMIT } from '../common/constants.js';
import {
  NotificationChannel,
  NotificationStatus,
} from '../../generated/prisma/enums.js';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly adapters = new Map<string, NotificationAdapter>();

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(NOTIFICATION_QUEUE_NAME)
    private readonly notificationQueue: Queue<NotificationJobData>,
    private readonly moduleRef: ModuleRef,
  ) {
    this.initAdapters();
  }

  private initAdapters(): void {
    try {
      const resend = this.moduleRef.get(ResendAdapter, { strict: false });
      if (resend) this.adapters.set(resend.channel, resend);
    } catch {
      this.logger.warn(
        'Resend adapter not registered — EMAIL notifications disabled',
      );
    }

    try {
      const line = this.moduleRef.get(LineAdapter, { strict: false });
      if (line) this.adapters.set(line.channel, line);
    } catch {
      this.logger.warn(
        'Line adapter not registered — LINE notifications disabled',
      );
    }
  }

  getAdapter(channel: string): NotificationAdapter | undefined {
    return this.adapters.get(channel);
  }

  async enqueue(
    workOrderId: string,
    channel: NotificationChannel,
    type: string,
    payload: Record<string, unknown>,
    userId?: string,
    customerId?: string,
  ): Promise<void> {
    const notification = await this.prisma.notification.create({
      data: {
        userId: userId ?? null,
        customerId: customerId ?? null,
        channel,
        type,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        payload: payload as any,
        status: NotificationStatus.PENDING,
      },
    });

    await this.notificationQueue.add(
      `notify:${type}:${notification.id}`,
      {
        notificationId: notification.id,
        channel: channel as 'EMAIL' | 'LINE',
        type,
        payload,
        recipientId: userId ?? customerId ?? 'unknown',
      },
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
      },
    );

    this.logger.debug(
      `Enqueued notification ${notification.id} (${type}) via ${channel}`,
    );
  }

  async process(notificationId: string, channel: string): Promise<void> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException(`Notification ${notificationId} not found`);
    }

    const adapter = this.getAdapter(channel);
    if (!adapter) {
      this.logger.warn(`No adapter found for channel: ${channel}`);
      await this.markFailed(
        notificationId,
        `No adapter for channel: ${channel}`,
      );
      return;
    }

    const recipient = notification.customerId
      ? await this.resolveCustomerRecipient(notification.customerId, channel)
      : notification.userId
        ? await this.resolveUserRecipient(notification.userId, channel)
        : null;

    if (!recipient) {
      await this.markFailed(notificationId, 'No recipient resolved');
      return;
    }

    const payload = notification.payload as Record<string, unknown>;
    const subject = this.buildSubject(notification.type, payload);
    const body = this.buildBody(notification.type, payload);

    const result = await adapter.send(recipient, subject, body);

    if (result.success) {
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: NotificationStatus.SENT,
          sentAt: new Date(),
        },
      });
      this.logger.debug(`Sent notification ${notificationId} via ${channel}`);
    } else {
      await this.markFailed(notificationId, result.error ?? 'Unknown error');
    }
  }

  async findAll(
    options: {
      status?: NotificationStatus;
      userId?: string;
      customerId?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const where: Record<string, unknown> = {};
    if (options.status) where.status = options.status;
    if (options.userId) where.userId = options.userId;
    if (options.customerId) where.customerId = options.customerId;

    const page = options.page ?? 1;
    const limit = options.limit ?? DEFAULT_PAGE_LIMIT;

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });
    if (!notification) throw new NotFoundException('Notification not found');
    return notification;
  }

  private async markFailed(
    notificationId: string,
    error: string,
  ): Promise<void> {
    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { status: NotificationStatus.FAILED },
    });
    this.logger.warn(`Notification ${notificationId} failed: ${error}`);
  }

  private async resolveUserRecipient(
    userId: string,
    channel: string,
  ): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, lineUserId: true },
    });
    if (!user) return null;
    return channel === 'LINE'
      ? (user.lineUserId ?? null)
      : (user.email ?? null);
  }

  private async resolveCustomerRecipient(
    customerId: string,
    channel: string,
  ): Promise<string | null> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { email: true, phone: true, lineUserId: true },
    });
    if (!customer) return null;
    if (channel === 'LINE') return customer.lineUserId ?? null;
    return customer.email ?? customer.phone ?? null;
  }

  private getStr(val: unknown, fallback: string): string {
    return typeof val === 'string' ? val : fallback;
  }

  private buildSubject(type: string, payload: Record<string, unknown>): string {
    const workOrderNumber = this.getStr(payload.workOrderNumber, '');
    const templates: Record<string, string> = {
      status_change: `Work Order #${workOrderNumber} Status Updated`,
      sla_warning: 'SLA Deadline Approaching — Action Required',
      issue_escalated: 'Issue Escalated — Coordinator Intervention Needed',
      rating_request: 'How was your service? Rate your technician',
      order_assigned: 'New Work Order Assigned',
      en_route: 'Technician is on the way',
    };
    return templates[type] ?? 'VoltDispatch Notification';
  }

  private buildBody(type: string, payload: Record<string, unknown>): string {
    const workOrderNumber = this.getStr(payload.workOrderNumber, '');
    const newStatus = this.getStr(payload.newStatus, 'unknown');
    const ratingUrl = this.getStr(payload.ratingUrl, '');
    const templates: Record<string, string> = {
      status_change: `Your work order status has been updated to ${newStatus}.`,
      sla_warning: `SLA deadline for work order #${workOrderNumber} is approaching. Please take action.`,
      issue_escalated: `An issue has been escalated for work order #${workOrderNumber}. A coordinator will review shortly.`,
      rating_request: `Your technician has completed the service. Please rate your experience: ${ratingUrl}`,
      order_assigned: `You have been assigned to work order #${workOrderNumber}. Please check the app for details.`,
      en_route: `Your technician is on the way for work order #${workOrderNumber}.`,
    };
    return templates[type] ?? 'You have a new notification from VoltDispatch.';
  }
}
