import { IsOptional, IsString } from 'class-validator';

export class ApproveDto {
  @IsOptional()
  @IsString()
  note?: string;
}
