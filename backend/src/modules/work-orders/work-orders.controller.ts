import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { WorkOrdersService } from './work-orders.service.js';
import { CreateWorkOrderDto } from './dto/create-work-order.dto.js';
import { AssignWorkOrderDto } from './dto/assign-work-order.dto.js';
import { RescheduleWorkOrderDto } from './dto/reschedule-work-order.dto.js';
import { TransitionNoteDto } from './dto/transition-note.dto.js';
import { WorkOrderQueryDto } from './dto/work-order-query.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/services/scoping.service.js';

@Controller('work-orders')
export class WorkOrdersController {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  @Post()
  @Roles('DEALER')
  create(
    @Body() dto: CreateWorkOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workOrdersService.create(dto, user);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query?: WorkOrderQueryDto,
  ) {
    return this.workOrdersService.findAll(user, query);
  }

  @Get(':id')
  findById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.workOrdersService.findById(id, user);
  }

  @Patch(':id/assign')
  @Roles('COORDINATOR')
  assign(
    @Param('id') id: string,
    @Body() dto: AssignWorkOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workOrdersService.assign(id, dto, user);
  }

  @Patch(':id/accept')
  @Roles('TECHNICIAN')
  accept(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.workOrdersService.accept(id, user);
  }

  @Patch(':id/decline')
  @Roles('TECHNICIAN')
  decline(
    @Param('id') id: string,
    @Body() dto: TransitionNoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workOrdersService.decline(id, user, dto.note);
  }

  @Patch(':id/reschedule')
  @Roles('COORDINATOR')
  reschedule(
    @Param('id') id: string,
    @Body() dto: RescheduleWorkOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workOrdersService.reschedule(id, dto, user);
  }

  @Patch(':id/start-travel')
  @Roles('TECHNICIAN')
  startTravel(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.workOrdersService.startTravel(id, user);
  }

  @Patch(':id/start-work')
  @Roles('TECHNICIAN')
  startWork(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.workOrdersService.startWork(id, user);
  }

  @Patch(':id/issue')
  @Roles('TECHNICIAN')
  reportIssue(
    @Param('id') id: string,
    @Body() dto: TransitionNoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workOrdersService.reportIssue(id, user, dto.note);
  }

  @Patch(':id/resolve-issue')
  @Roles('TECHNICIAN')
  resolveIssue(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workOrdersService.resolveIssue(id, user);
  }

  @Patch(':id/escalate')
  @Roles('COORDINATOR')
  escalate(
    @Param('id') id: string,
    @Body() dto: TransitionNoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workOrdersService.escalate(id, user, dto.note);
  }

  @Patch(':id/complete')
  @Roles('TECHNICIAN')
  complete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.workOrdersService.complete(id, user);
  }

  @Patch(':id/cancel')
  @Roles('DEALER', 'HQ', 'TECHNICIAN', 'CUSTOMER')
  cancel(
    @Param('id') id: string,
    @Body() dto: TransitionNoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workOrdersService.cancel(id, user, dto.note);
  }
}
