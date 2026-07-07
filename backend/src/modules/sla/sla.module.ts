import { Module } from '@nestjs/common';
import { SlaService } from './sla.service.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [NotificationsModule],
  providers: [SlaService],
  exports: [SlaService],
})
export class SlaModule {}
