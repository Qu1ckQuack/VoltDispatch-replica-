import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { DealersController } from './dealers.controller.js';
import { DealersService } from './dealers.service.js';

@Module({
  imports: [UsersModule],
  controllers: [DealersController],
  providers: [DealersService],
  exports: [DealersService],
})
export class DealersModule {}
