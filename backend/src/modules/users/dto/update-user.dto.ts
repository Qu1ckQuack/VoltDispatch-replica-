import { IsOptional, IsEmail, IsString, IsEnum } from 'class-validator';
import { UserRole } from '../../../generated/prisma/enums.js';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
