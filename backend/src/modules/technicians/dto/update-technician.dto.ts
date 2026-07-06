import { IsOptional, IsString } from 'class-validator';

export class UpdateTechnicianDto {
  @IsOptional()
  @IsString()
  subDistrict?: string;
}
