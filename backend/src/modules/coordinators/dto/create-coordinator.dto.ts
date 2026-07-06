import { IsString } from 'class-validator';

export class CreateCoordinatorDto {
  @IsString()
  userId!: string;

  @IsString()
  department!: string;
}
