import { IsEnum } from 'class-validator';
import { TechnicianStatus } from '../../../generated/prisma/enums.js';

export class UpdateStatusDto {
  @IsEnum(TechnicianStatus)
  status!: TechnicianStatus;
}
