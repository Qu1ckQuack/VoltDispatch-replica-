import { Controller, Get, Query } from '@nestjs/common';
import { ReportingService } from './reporting.service.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { SummaryQueryDto, SearchQueryDto } from './dto/summery-query.dto.js';

@Controller('reporting')
@Roles('HQ')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('overview')
  getOverview() {
    return this.reportingService.getOverview();
  }

  @Get('summary')
  getSummary(@Query() query: SummaryQueryDto) {
    return this.reportingService.getSummary(query);
  }

  @Get('search')
  search(@Query() query: SearchQueryDto) {
    return this.reportingService.search(query.q);
  }
}
