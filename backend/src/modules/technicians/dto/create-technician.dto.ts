import { IsString, IsOptional } from 'class-validator';

export class CreateTechnicianDto {
  @IsString()
  userId!: string;

  @IsString()
  subDistrict!: string;
}
