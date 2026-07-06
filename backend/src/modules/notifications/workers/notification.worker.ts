import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker } from 'bullmq';
import { NOTIFICATION_QUEUE_NAME } from '../../bullmq/queues/notification.queue.js';
import { NotificationsService } from '../notifications.service.js';
import { buildRedisConnectionOptions } from '../../bullmq/bullmq.module.js';

@Injectable()
export class NotificationWorker implements OnModuleInit {
  private readonly logger = new Logger(NotificationWorker.name);
  private worker: Worker | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly notificationsService: NotificationsService,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker(
      NOTIFICATION_QUEUE_NAME,
      async (job) => {
        const { notificationId, channel } = job.data as {
          notificationId: string;
          channel: string;
        };
        this.logger.debug(
          `Processing notification job ${job.id}: ${notificationId} via ${channel}`,
        );
        await this.notificationsService.process(notificationId, channel);
      },
      {
        connection: buildRedisConnectionOptions(this.config),
        concurrency: 5,
      },
    );

    this.worker.on('completed', (job) => {
      this.logger.debug(`Notification job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Notification job ${job?.id} failed: ${err.message}`);
    });

    this.worker.on('error', (err) => {
      this.logger.error(`Notification worker error: ${err.message}`);
    });

    this.logger.log('Notification worker started');
  }
}
