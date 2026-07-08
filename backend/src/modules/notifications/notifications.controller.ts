import { Controller, Get, Param, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/services/scoping.service.js';
import { NotificationStatus } from '../../generated/prisma/enums.js';
import { UserRole } from '../../generated/prisma/enums.js';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Roles('HQ', 'COORDINATOR')
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.findAll({
      status: status as NotificationStatus | undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      userId: user.role === UserRole.COORDINATOR ? user.id : undefined,
    });
  }

  @Get(':id')
  @Roles('HQ', 'COORDINATOR')
  findById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.findById(id);
  }
}
