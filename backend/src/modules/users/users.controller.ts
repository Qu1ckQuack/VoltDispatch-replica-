import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles('HQ')
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  @Roles('HQ')
  findAll() {
    return this.usersService.findAll();
  }

  @Patch(':id/deactivate')
  @Roles('HQ')
  deactivate(@Param('id') id: string) {
    return this.usersService.deactivate(id);
  }
}
