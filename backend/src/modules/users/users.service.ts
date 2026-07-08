import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

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
      throw new ConflictException('Email already in use');
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

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findAll() {
    return this.prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findById(id);
    return this.prisma.user.update({
      where: { id },
      data: dto,
    });
  }

  async deactivate(id: string) {
    const user = await this.findById(id);
    return this.prisma.user.update({
      where: { id: user.id },
      data: { isActive: false },
    });
  }

  async resetPassword(id: string, newPassword: string) {
    const user = await this.findById(id);
    const passwordHash = await bcrypt.hash(newPassword, this.bcryptRounds);
    return this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
  }
}
