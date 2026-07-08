import { IsString } from 'class-validator';

export class CreateTechnicianDto {
  @IsString()
  userId!: string;

  @IsString()
  district!: string;

  @IsString()
  subDistrict!: string;

  @IsString()
  zipCode!: string;
}
