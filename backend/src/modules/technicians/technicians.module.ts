import { Module } from '@nestjs/common';
import { TechniciansService } from './technicians.service.js';

@Module({
  providers: [TechniciansService],
  exports: [TechniciansService],
})
export class TechniciansModule {}
