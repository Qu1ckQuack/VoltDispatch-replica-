import { IsString } from 'class-validator';

export class CreateTechnicianDto {
  @IsString()
  userId!: string;

  @IsString()
  subDistrict!: string;
}
