import { IsOptional, IsString } from 'class-validator';

export class UpdateCoordinatorDto {
  @IsOptional()
  @IsString()
  department?: string;
}
