import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { DealersService } from './dealers.service.js';
import { CreateDealerDto } from './dto/create-dealer.dto.js';
import { UpdateDealerDto } from './dto/update-dealer.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/services/scoping.service.js';
import { BadRequestAppException } from '../common/errors/app-exception.js';

@Controller('dealers')
@Roles('HQ')
export class DealersController {
  constructor(private readonly dealersService: DealersService) {}

  @Post()
  create(@Body() dto: CreateDealerDto) {
    return this.dealersService.create(dto);
  }

  @Get()
  findAll() {
    return this.dealersService.findAll();
  }

  @Get('me')
  @Roles('DEALER')
  findMyProfile(@CurrentUser() user: AuthenticatedUser) {
    if (!user.profileId) {
      throw new BadRequestAppException('No dealer profile linked to this user');
    }
    return this.dealersService.findById(user.profileId);
  }

  @Get('by-user/:userId')
  findByUserId(@Param('userId') userId: string) {
    return this.dealersService.findByUserId(userId);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.dealersService.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDealerDto) {
    return this.dealersService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.dealersService.remove(id);
  }
}
