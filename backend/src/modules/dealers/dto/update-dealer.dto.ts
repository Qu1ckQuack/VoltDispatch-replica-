import { IsOptional, IsString, IsObject } from 'class-validator';

export class UpdateDealerDto {
  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsObject()
  contactInfo?: Record<string, unknown>;
}
