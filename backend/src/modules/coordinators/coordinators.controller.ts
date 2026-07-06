import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { CoordinatorsService } from './coordinators.service.js';
import { CreateCoordinatorDto } from './dto/create-coordinator.dto.js';
import { UpdateCoordinatorDto } from './dto/update-coordinator.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@Controller('coordinators')
@Roles('HQ')
export class CoordinatorsController {
  constructor(private readonly coordinatorsService: CoordinatorsService) {}

  @Post()
  create(@Body() dto: CreateCoordinatorDto) {
    return this.coordinatorsService.create(dto);
  }

  @Get()
  findAll() {
    return this.coordinatorsService.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.coordinatorsService.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCoordinatorDto) {
    return this.coordinatorsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.coordinatorsService.remove(id);
  }
}
