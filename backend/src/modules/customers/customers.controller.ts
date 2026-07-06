import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { CustomersService } from './customers.service.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/services/scoping.service.js';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @Roles('HQ', 'DEALER')
  create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  @Get()
  @Roles('HQ', 'DEALER')
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.customersService.findAll(user);
  }

  @Get(':id')
  @Roles('HQ', 'DEALER')
  findById(@Param('id') id: string) {
    return this.customersService.findById(id);
  }

  @Patch(':id')
  @Roles('HQ', 'DEALER')
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(id, dto);
  }

  @Delete(':id')
  @Roles('HQ', 'DEALER')
  remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }
}
