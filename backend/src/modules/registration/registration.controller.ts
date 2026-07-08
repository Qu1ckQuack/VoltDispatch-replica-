import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { RegistrationService } from './registration.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/services/scoping.service.js';
import { UserRole } from '../../generated/prisma/enums.js';

@Controller('register')
export class RegistrationController {
  constructor(private readonly registrationService: RegistrationService) {}

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post()
  register(@Body() dto: RegisterDto) {
    return this.registrationService.register(dto);
  }

  @Get('requests')
  @Roles('HQ', 'COORDINATOR')
  findPending(@CurrentUser() user: AuthenticatedUser) {
    const role =
      user.role === 'COORDINATOR' ? UserRole.TECHNICIAN : UserRole.DEALER;
    return this.registrationService.findPending(role);
  }

  @Post('approve/:id')
  @Roles('HQ', 'COORDINATOR')
  approve(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.registrationService.approve(id, user);
  }

  @Post('reject/:id')
  @Roles('HQ', 'COORDINATOR')
  reject(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.registrationService.reject(id, user);
  }
}
