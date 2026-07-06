import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { DevicesService } from './devices.service.js';
import { CreateDeviceDto } from './dto/create-device.dto.js';
import { UpdateDeviceDto } from './dto/update-device.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/services/scoping.service.js';

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  @Roles('DEALER')
  create(@Body() dto: CreateDeviceDto, @CurrentUser() user: AuthenticatedUser) {
    return this.devicesService.create(dto, user.profileId!);
  }

  @Get()
  @Roles('DEALER', 'HQ')
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('dealerId') dealerId?: string,
  ) {
    const scope = user.role === 'HQ' ? dealerId : user.profileId!;
    return this.devicesService.findAll(scope);
  }

  @Get(':id')
  @Roles('DEALER', 'HQ')
  findById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.devicesService.findById(id, user);
  }

  @Patch(':id')
  @Roles('DEALER', 'HQ')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDeviceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.devicesService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles('DEALER', 'HQ')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.devicesService.remove(id, user);
  }
}
