import { IsEnum, IsString } from 'class-validator';
import { ImageType } from '../../../generated/prisma/enums.js';

export class UploadImageDto {
  @IsEnum(ImageType)
  type!: ImageType;
}
