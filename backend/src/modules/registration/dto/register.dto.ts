import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../../generated/prisma/enums.js';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsString()
  @IsNotEmpty()
  district!: string;

  @IsOptional()
  @IsString()
  subDistrict?: string;

  @IsString()
  @IsNotEmpty()
  zipCode!: string;

  @IsOptional()
  @IsString()
  companyName?: string;
}
