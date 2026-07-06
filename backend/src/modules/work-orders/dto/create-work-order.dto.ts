import { IsString, IsOptional, IsInt, Min, Max, IsDateString } from 'class-validator';

export class CreateWorkOrderDto {
  @IsString()
  customerId!: string;

  @IsString()
  deviceId!: string;

  @IsString()
  subDistrict!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2)
  priority?: number;

  @IsOptional()
  @IsDateString()
  appointmentDate?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsDateString()
  slaDeadline?: string;
}
