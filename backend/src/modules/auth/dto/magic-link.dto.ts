import { IsString } from 'class-validator';

export class MagicLinkDto {
  @IsString()
  token!: string;
}
