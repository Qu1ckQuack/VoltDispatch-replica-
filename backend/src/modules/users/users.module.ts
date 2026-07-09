import { Module } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { UsersAvatarController } from './users-avatar.controller.js';
import { MediaModule } from '../media/media.module.js';

@Module({
  imports: [MediaModule],
  controllers: [UsersController, UsersAvatarController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
