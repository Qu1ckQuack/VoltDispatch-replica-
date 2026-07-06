import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaService } from './prisma.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { TokenRevokeService } from './services/token-revoke.service.js';
import { ScopingService } from './services/scoping.service.js';

@Global()
@Module({
  providers: [
    PrismaService,
    TokenRevokeService,
    ScopingService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [PrismaService, TokenRevokeService, ScopingService],
})
export class CommonModule {}
