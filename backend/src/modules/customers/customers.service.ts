import { Injectable, HttpStatus } from '@nestjs/common';
import {
  AppException,
  NotFoundAppException,
  ConflictAppException,
} from '../common/errors/app-exception.js';
import { ErrorCodes } from '../common/errors/error-codes.js';
import * as crypto from 'node:crypto';
import { PrismaService } from '../common/prisma.service.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';
import type { AuthenticatedUser } from '../common/services/scoping.service.js';
import { UserRole, WorkOrderStatus } from '../../generated/prisma/enums.js';

const TOKEN_BYTES = 32;

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByAccessToken(token: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { accessToken: token },
      include: { workOrders: true },
    });
    if (!customer) {
      throw new AppException(
        ErrorCodes.NOT_FOUND,
        'Invalid or expired access token',
        HttpStatus.NOT_FOUND,
      );
    }
    return customer;
  }

  async generateAccessToken(customerId: string) {
    const raw = crypto.randomBytes(TOKEN_BYTES).toString('hex');
    await this.prisma.customer.update({
      where: { id: customerId },
      data: { accessToken: raw },
    });
    return raw;
  }

  async consumeAccessToken(token: string) {
    const customer = await this.findByAccessToken(token);
    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { accessToken: null },
    });
    return customer;
  }

  async create(dto: CreateCustomerDto) {
    return this.prisma.customer.create({ data: dto });
  }

  async findAll(user?: AuthenticatedUser) {
    const where: Record<string, unknown> = {};
    if (user && user.role === UserRole.DEALER && user.profileId) {
      where.workOrders = { some: { dealerId: user.profileId } };
    }
    return this.prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { workOrders: true } } },
    });
  }

  async findById(id: string, user?: AuthenticatedUser) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: { workOrders: true },
    });
    if (!customer) throw new NotFoundAppException('Customer');

    if (user && user.role === UserRole.DEALER && user.profileId) {
      const hasAccess = customer.workOrders.some(
        (wo: { dealerId: string }) => wo.dealerId === user.profileId,
      );
      if (!hasAccess) {
        throw new NotFoundAppException('Customer');
      }
    }

    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto, user?: AuthenticatedUser) {
    await this.findById(id, user);
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  async remove(id: string, user?: AuthenticatedUser) {
    await this.findById(id, user);

    const activeOrders = await this.prisma.workOrder.count({
      where: {
        customerId: id,
        status: {
          notIn: [WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED],
        },
      },
    });

    if (activeOrders > 0) {
      throw new ConflictAppException(
        'Cannot delete customer with active work orders',
        ErrorCodes.CONFLICT_ACTIVE_ORDERS,
      );
    }

    await this.prisma.customer.delete({ where: { id } });
    return { deleted: true };
  }
}
