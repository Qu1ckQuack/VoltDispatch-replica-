import { Module } from '@nestjs/common';
import { CoordinatorsController } from './coordinators.controller.js';
import { CoordinatorsService } from './coordinators.service.js';

@Module({
  controllers: [CoordinatorsController],
  providers: [CoordinatorsService],
  exports: [CoordinatorsService],
})
export class CoordinatorsModule {}
