import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma.service.js';
import {
  BadRequestAppException,
  ConflictAppException,
  NotFoundAppException,
  ForbiddenAppException,
} from '../common/errors/app-exception.js';
import { ErrorCodes } from '../common/errors/error-codes.js';
import { RegisterDto } from './dto/register.dto.js';
import { UserRole } from '../../generated/prisma/enums.js';
import type { AuthenticatedUser } from '../common/services/scoping.service.js';

@Injectable()
export class RegistrationService {
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

  async register(dto: RegisterDto) {
    if (dto.role !== UserRole.TECHNICIAN && dto.role !== UserRole.DEALER) {
      throw new BadRequestAppException(
        'Registration is only available for Technician or Dealer roles',
      );
    }

    if (dto.role === UserRole.TECHNICIAN && !dto.subDistrict) {
      throw new BadRequestAppException(
        'subDistrict is required for Technician registration',
      );
    }

    if (dto.role === UserRole.DEALER && !dto.companyName) {
      throw new BadRequestAppException(
        'companyName is required for Dealer registration',
      );
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictAppException(
        'Email already registered',
        ErrorCodes.CONFLICT_DUPLICATE,
      );
    }

    const existingRequest = await this.prisma.registrationRequest.findUnique({
      where: { email: dto.email },
    });
    if (existingRequest && existingRequest.status === 'PENDING') {
      throw new ConflictAppException(
        'A pending registration request already exists for this email',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, this.bcryptRounds);

    await this.prisma.registrationRequest.upsert({
      where: { email: dto.email },
      update: {
        phone: dto.phone,
        role: dto.role,
        district: dto.district,
        subDistrict: dto.subDistrict ?? null,
        zipCode: dto.zipCode,
        companyName: dto.companyName ?? null,
        passwordHash,
        status: 'PENDING',
      },
      create: {
        email: dto.email,
        passwordHash,
        phone: dto.phone,
        role: dto.role,
        district: dto.district,
        subDistrict: dto.subDistrict ?? null,
        zipCode: dto.zipCode,
        companyName: dto.companyName ?? null,
      },
    });

    return { message: 'Registration submitted for approval' };
  }

  async findPending(role: UserRole) {
    return this.prisma.registrationRequest.findMany({
      where: { status: 'PENDING', role },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approve(id: string, approver: AuthenticatedUser) {
    const request = await this.prisma.registrationRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundAppException('Registration request');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestAppException(
        `Request is already ${request.status.toLowerCase()}`,
      );
    }

    this.verifyApproverAccess(approver.role, request.role);

    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: request.email,
          passwordHash: request.passwordHash,
          role: request.role,
          phone: request.phone,
          isActive: true,
        },
      });

      if (request.role === UserRole.TECHNICIAN) {
        await tx.technician.create({
          data: {
            userId: user.id,
            district: request.district,
            subDistrict: request.subDistrict!,
            zipCode: request.zipCode,
          },
        });
      } else if (request.role === UserRole.DEALER) {
        await tx.dealer.create({
          data: {
            userId: user.id,
            companyName: request.companyName!,
            contactInfo: {
              district: request.district,
              zipCode: request.zipCode,
            },
          },
        });
      }

      await tx.registrationRequest.update({
        where: { id },
        data: { status: 'APPROVED' },
      });
    });

    return { message: 'Registration approved' };
  }

  async reject(id: string, approver: AuthenticatedUser) {
    const request = await this.prisma.registrationRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundAppException('Registration request');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestAppException(
        `Request is already ${request.status.toLowerCase()}`,
      );
    }

    this.verifyApproverAccess(approver.role, request.role);

    await this.prisma.registrationRequest.update({
      where: { id },
      data: { status: 'REJECTED' },
    });

    return { message: 'Registration rejected' };
  }

  private verifyApproverAccess(approverRole: string, targetRole: UserRole) {
    if (approverRole === 'COORDINATOR' && targetRole !== UserRole.TECHNICIAN) {
      throw new ForbiddenAppException(
        'Coordinators can only approve Technician registrations',
      );
    }
    if (approverRole === 'HQ' && targetRole !== UserRole.DEALER) {
      throw new ForbiddenAppException(
        'HQ can only approve Dealer registrations',
      );
    }
  }
}
