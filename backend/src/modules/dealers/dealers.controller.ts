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
