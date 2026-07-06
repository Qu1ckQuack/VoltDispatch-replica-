import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateDealerDto {
  @IsString()
  userId!: string;

  @IsString()
  companyName!: string;

  @IsOptional()
  @IsObject()
  contactInfo?: Record<string, unknown>;
}
