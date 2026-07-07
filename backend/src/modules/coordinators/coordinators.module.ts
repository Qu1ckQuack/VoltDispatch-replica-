import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { CoordinatorsController } from './coordinators.controller.js';
import { CoordinatorsService } from './coordinators.service.js';

@Module({
  imports: [UsersModule],
  controllers: [CoordinatorsController],
  providers: [CoordinatorsService],
  exports: [CoordinatorsService],
})
export class CoordinatorsModule {}
