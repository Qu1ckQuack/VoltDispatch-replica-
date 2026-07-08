import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';
import { NotificationWorker } from './workers/notification.worker.js';
import { NotificationSubscriber } from './notification-subscriber.service.js';
import { ResendAdapter } from './adapters/resend.adapter.js';
import { LineAdapter } from './adapters/line.adapter.js';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationWorker,
    NotificationSubscriber,
    ResendAdapter,
    LineAdapter,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
