import { IsOptional, IsEnum, IsString } from 'class-validator';

export enum ReportPeriod {
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
}

export class SummaryQueryDto {
  @IsOptional()
  @IsEnum(ReportPeriod)
  period?: ReportPeriod;
}

export class SearchQueryDto {
  @IsString()
  q!: string;
}
