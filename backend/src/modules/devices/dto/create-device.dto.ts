import { IsString, IsOptional, IsIP, IsObject } from 'class-validator';

export class CreateDeviceDto {
  @IsString()
  model!: string;

  @IsString()
  serialNumber!: string;

  @IsOptional()
  @IsIP()
  ipAddress?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
