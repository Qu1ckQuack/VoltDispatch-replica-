import { IsString } from 'class-validator';

export class AssignWorkOrderDto {
  @IsString()
  technicianId!: string;
}
