import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { TechniciansController } from './technicians.controller.js';
import { TechniciansService } from './technicians.service.js';

@Module({
  imports: [UsersModule],
  controllers: [TechniciansController],
  providers: [TechniciansService],
  exports: [TechniciansService],
})
export class TechniciansModule {}
