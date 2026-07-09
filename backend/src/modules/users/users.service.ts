import { Injectable } from '@nestjs/common';
import {
  NotFoundAppException,
  ConflictAppException,
} from '../common/errors/app-exception.js';
import { ErrorCodes } from '../common/errors/error-codes.js';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import type { User } from '../../generated/prisma/client.js';

@Injectable()
export class UsersService {
  private readonly bcryptRounds: number;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.bcryptRounds = parseInt(
      config.getOrThrow<string>('BCRYPT_ROUNDS'),
      10,
    );
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictAppException(
        'Email already in use',
        ErrorCodes.CONFLICT_DUPLICATE,
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, this.bcryptRounds);

    return this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        role: dto.role,
        phone: dto.phone,
      },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) throw new NotFoundAppException('User');
    return user;
  }

  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    await this.findById(id);
    return this.prisma.user.update({
      where: { id },
      data: dto,
    });
  }

  async deactivate(id: string): Promise<User> {
    const user = await this.findById(id);
    return this.prisma.user.update({
      where: { id: user.id },
      data: { isActive: false },
    });
  }

  async resetPassword(id: string, newPassword: string): Promise<User> {
    const user = await this.findById(id);
    const passwordHash = await bcrypt.hash(newPassword, this.bcryptRounds);
    return this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
  }

  async updateAvatarKey(id: string, avatarKey: string | null): Promise<User> {
    await this.findById(id);
    return this.prisma.user.update({
      where: { id },
      data: { avatarKey },
    });
  }
}
