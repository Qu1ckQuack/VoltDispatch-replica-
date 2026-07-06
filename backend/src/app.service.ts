import { Injectable } from '@nestjs/common';
import { PrismaService } from './modules/common/prisma.service.js';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getStatus() {
    return { status: 'ok', service: 'VoltDispatch API' };
  }

  async healthCheck() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
