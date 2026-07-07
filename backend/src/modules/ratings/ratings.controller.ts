import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/services/scoping.service.js';
import { RatingsService } from './ratings.service.js';
import { CreateRatingDto } from './dto/create-rating.dto.js';

@Controller('work-orders/:workOrderId/ratings')
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post()
  @Roles('CUSTOMER')
  @HttpCode(201)
  async create(
    @Param('workOrderId') workOrderId: string,
    @Body() dto: CreateRatingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ratingsService.create(workOrderId, dto, user);
  }

  @Get()
  @Roles('HQ', 'DEALER', 'COORDINATOR', 'TECHNICIAN')
  async find(
    @Param('workOrderId') workOrderId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ratingsService.findByWorkOrder(workOrderId, user);
  }

  @Delete(':ratingId')
  @Roles('HQ')
  @HttpCode(204)
  async remove(
    @Param('ratingId') ratingId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.ratingsService.delete(ratingId, user);
  }
}
