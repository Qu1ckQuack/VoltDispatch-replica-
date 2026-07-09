import {
  Global,
  Module,
  type MiddlewareConsumer,
  type NestModule,
} from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { PrismaService } from './prisma.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { TokenRevokeService } from './services/token-revoke.service.js';
import { ScopingService } from './services/scoping.service.js';
import { AppExceptionFilter } from './filters/app-exception.filter.js';
import { RequestIdMiddleware } from './middleware/request-id.middleware.js';

@Global()
@Module({
  providers: [
    PrismaService,
    TokenRevokeService,
    ScopingService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: AppExceptionFilter },
  ],
  exports: [PrismaService, TokenRevokeService, ScopingService],
})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
