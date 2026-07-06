import { Module } from '@nestjs/common';
import { DealersService } from './dealers.service.js';

@Module({
  providers: [DealersService],
  exports: [DealersService],
})
export class DealersModule {}
