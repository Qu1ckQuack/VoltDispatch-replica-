import { IsOptional, IsString } from 'class-validator';

export class UpdateTechnicianDto {
  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  subDistrict?: string;

  @IsOptional()
  @IsString()
  zipCode?: string;
}
