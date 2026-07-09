import { Controller, Get, Query } from '@nestjs/common';
import { ReportingService } from './reporting.service.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/services/scoping.service.js';
import { SummaryQueryDto, SearchQueryDto } from './dto/summary-query.dto.js';

@Controller('reporting')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('overview')
  @Roles('HQ', 'COORDINATOR', 'TECHNICIAN', 'DEALER')
  getOverview(@CurrentUser() user: AuthenticatedUser) {
    return this.reportingService.getOverview(user);
  }

  @Get('summary')
  @Roles('HQ')
  getSummary(@Query() query: SummaryQueryDto) {
    return this.reportingService.getSummary(query);
  }

  @Get('search')
  @Roles('HQ')
  search(@Query() query: SearchQueryDto) {
    return this.reportingService.search(query.q);
  }
}
