import { Injectable } from '@nestjs/common';
import { UnauthorizedAppException } from '../../common/errors/app-exception.js';
import { ErrorCodes } from '../../common/errors/error-codes.js';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TokenRevokeService } from '../../common/services/token-revoke.service.js';

export interface WsAuthenticatedUser {
  id: string;
  role: string;
  profileId: string | null;
  email: string;
  name?: string;
}

@Injectable()
export class WsAuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly tokenRevokeService: TokenRevokeService,
  ) {}

  async verify(token: string, origin: string): Promise<WsAuthenticatedUser> {
    const allowedOrigins = this.getAllowedOrigins();
    if (allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
      throw new UnauthorizedAppException('Origin not allowed', ErrorCodes.AUTH_WS_ORIGIN_DENIED);
    }

    try {
      const payload = this.jwtService.verify<{
        sub: string;
        email: string;
        role: string;
        type: string;
        profileId?: string | null;
        name?: string;
      }>(token);

      if (payload.type !== 'access' && payload.type !== 'customer') {
        throw new UnauthorizedAppException('Invalid token type for WebSocket', ErrorCodes.AUTH_INVALID_TOKEN);
      }

      if (payload.type === 'access') {
        const revoked = await this.tokenRevokeService.isRevoked(payload.sub);
        if (revoked) {
          throw new UnauthorizedAppException('Token has been revoked', ErrorCodes.AUTH_TOKEN_REVOKED);
        }
      }

      return {
        id: payload.sub,
        email: payload.email,
        role: payload.type === 'customer' ? 'CUSTOMER' : payload.role,
        profileId: payload.profileId ?? null,
        name: payload.name,
      };
    } catch (err) {
      if (err instanceof UnauthorizedAppException) throw err;
      throw new UnauthorizedAppException('Invalid or expired token', ErrorCodes.AUTH_TOKEN_EXPIRED);
    }
  }

  private getAllowedOrigins(): string[] {
    const envOrigin = this.configService.get<string>('ALLOWED_ORIGINS');
    if (!envOrigin) return [];
    return envOrigin.split(',').map((o) => o.trim());
  }
}
