import { Controller, Get, Param, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { NotificationStatus } from '../../generated/prisma/enums.js';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Roles('HQ', 'COORDINATOR')
  findAll(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.findAll({
      status: status as NotificationStatus | undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  @Roles('HQ', 'COORDINATOR')
  findById(@Param('id') id: string) {
    return this.notificationsService.findById(id);
  }
}
