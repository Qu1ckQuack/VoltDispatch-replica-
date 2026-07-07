import {
  IsInt,
  Min,
  Max,
  MaxLength,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateRatingDto {
  @IsInt()
  @Min(1)
  @Max(5)
  score!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
