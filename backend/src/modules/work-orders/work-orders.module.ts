import { Module } from '@nestjs/common';
import { WorkOrdersController } from './work-orders.controller.js';
import { WorkOrdersService } from './work-orders.service.js';
import { StateMachineService } from './services/state-machine.service.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [NotificationsModule],
  controllers: [WorkOrdersController],
  providers: [WorkOrdersService, StateMachineService],
})
export class WorkOrdersModule {}
