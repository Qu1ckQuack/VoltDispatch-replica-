import { IsDateString } from 'class-validator';

export class RescheduleWorkOrderDto {
  @IsDateString()
  appointmentDate!: string;
}
