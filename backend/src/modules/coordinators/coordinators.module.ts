import { Module } from '@nestjs/common';
import { CoordinatorsService } from './coordinators.service.js';

@Module({
  providers: [CoordinatorsService],
  exports: [CoordinatorsService],
})
export class CoordinatorsModule {}
