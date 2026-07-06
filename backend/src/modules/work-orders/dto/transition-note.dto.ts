import { IsOptional, IsString } from 'class-validator';

export class TransitionNoteDto {
  @IsOptional()
  @IsString()
  note?: string;
}
