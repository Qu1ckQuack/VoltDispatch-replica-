import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { TechniciansService } from './technicians.service.js';
import { CreateTechnicianDto } from './dto/create-technician.dto.js';
import { UpdateTechnicianDto } from './dto/update-technician.dto.js';
import { UpdateStatusDto } from './dto/update-status.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/services/scoping.service.js';
import { BadRequestAppException } from '../common/errors/app-exception.js';

@Controller('technicians')
export class TechniciansController {
  constructor(private readonly techniciansService: TechniciansService) {}

  @Post()
  @Roles('HQ')
  create(@Body() dto: CreateTechnicianDto) {
    return this.techniciansService.create(dto);
  }

  @Get()
  @Roles('HQ')
  findAll() {
    return this.techniciansService.findAll();
  }

  @Get('me')
  @Roles('TECHNICIAN')
  findMyProfile(@CurrentUser() user: AuthenticatedUser) {
    if (!user.profileId) {
      throw new BadRequestAppException(
        'No technician profile linked to this user',
      );
    }
    return this.techniciansService.findById(user.profileId);
  }

  @Get('by-user/:userId')
  @Roles('HQ')
  findByUserId(@Param('userId') userId: string) {
    return this.techniciansService.findByUserId(userId);
  }

  @Get(':id')
  @Roles('HQ')
  findById(@Param('id') id: string) {
    return this.techniciansService.findById(id);
  }

  @Patch(':id')
  @Roles('HQ')
  update(@Param('id') id: string, @Body() dto: UpdateTechnicianDto) {
    return this.techniciansService.update(id, dto);
  }

  @Delete(':id')
  @Roles('HQ')
  remove(@Param('id') id: string) {
    return this.techniciansService.remove(id);
  }

  @Patch('me/status')
  @Roles('TECHNICIAN')
  updateMyStatus(
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.profileId) {
      throw new BadRequestAppException(
        'No technician profile linked to this user',
      );
    }
    return this.techniciansService.updateStatus(user.profileId, dto);
  }
}
