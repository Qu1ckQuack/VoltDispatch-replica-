import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { UserRole } from '../../../generated/prisma/enums.js';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Matches(
    /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/,
    { message: 'Password must be at least 8 characters with 1 letter, 1 number, and 1 special character' },
  )
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
