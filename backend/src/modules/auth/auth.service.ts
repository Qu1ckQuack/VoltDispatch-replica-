import { Injectable, Logger } from '@nestjs/common';
import { UnauthorizedAppException } from '../common/errors/app-exception.js';
import { ErrorCodes } from '../common/errors/error-codes.js';
import { JsonWebTokenError, TokenExpiredError, JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service.js';
import { DealersService } from '../dealers/dealers.service.js';
import { TechniciansService } from '../technicians/technicians.service.js';
import { CoordinatorsService } from '../coordinators/coordinators.service.js';
import { MagicLinkService } from './services/magic-link.service.js';
import { TokenRevokeService } from '../common/services/token-revoke.service.js';
import { extractErrorMessage } from '../common/utils/error-message.js';
import { LoginDto } from './dto/login.dto.js';
import { UserRole } from '../../generated/prisma/enums.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly magicLinkService: MagicLinkService,
    private readonly tokenRevokeService: TokenRevokeService,
    private readonly dealersService: DealersService,
    private readonly techniciansService: TechniciansService,
    private readonly coordinatorsService: CoordinatorsService,
  ) {
    this.accessTokenExpiry = this.configService.get<string>(
      'JWT_ACCESS_EXPIRY',
      '15m',
    );
    this.refreshTokenExpiry = this.configService.get<string>(
      'JWT_REFRESH_EXPIRY',
      '7d',
    );
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedAppException(
        'Invalid credentials',
        ErrorCodes.AUTH_INVALID_CREDENTIALS,
      );
    }

    if (!user.isActive) {
      await this.tokenRevokeService.revoke(user.id);
      throw new UnauthorizedAppException(
        'Account is deactivated',
        ErrorCodes.AUTH_ACCOUNT_DEACTIVATED,
      );
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedAppException(
        'Invalid credentials',
        ErrorCodes.AUTH_INVALID_CREDENTIALS,
      );
    }

    return this.generateTokens(user.id, user.email, user.role);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<{
        sub: string;
        email: string;
        role: string;
        type: string;
      }>(refreshToken);

      if (payload.type !== 'refresh') {
        throw new UnauthorizedAppException(
          'Invalid token type',
          ErrorCodes.AUTH_INVALID_TOKEN,
        );
      }

      const user = await this.usersService.findById(payload.sub);

      if (!user.isActive) {
        await this.tokenRevokeService.revoke(user.id);
        throw new UnauthorizedAppException(
          'Account is deactivated',
          ErrorCodes.AUTH_ACCOUNT_DEACTIVATED,
        );
      }

      return this.generateTokens(user.id, user.email, user.role);
    } catch (refreshError) {
      this.logger.warn(`Refresh failed: ${extractErrorMessage(refreshError)}`);
      if (refreshError instanceof UnauthorizedAppException) throw refreshError;
      if (refreshError instanceof TokenExpiredError) {
        throw new UnauthorizedAppException(
          'Refresh token expired',
          ErrorCodes.AUTH_TOKEN_EXPIRED,
        );
      }
      if (refreshError instanceof JsonWebTokenError) {
        throw new UnauthorizedAppException(
          'Invalid refresh token',
          ErrorCodes.AUTH_INVALID_TOKEN,
        );
      }
      throw new UnauthorizedAppException(
        'Invalid or expired refresh token',
        ErrorCodes.AUTH_TOKEN_EXPIRED,
      );
    }
  }

  async loginViaMagicLink(token: string) {
    return this.magicLinkService.authenticate(token);
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const resolved = await this.resolveProfileId(userId, role);
    const { profileId, department } = resolved;

    const accessTokenPayload: Record<string, unknown> = {
      sub: userId,
      email,
      role,
      profileId,
      type: 'access',
    };
    if (department) {
      accessTokenPayload.department = department;
    }

    const accessTokenExpirySeconds = this.parseExpiryToSeconds(
      this.accessTokenExpiry,
    );
    const refreshTokenExpirySeconds = this.parseExpiryToSeconds(
      this.refreshTokenExpiry,
    );

    const accessToken = this.jwtService.sign(accessTokenPayload, {
      expiresIn: accessTokenExpirySeconds,
    });

    const refreshToken = this.jwtService.sign(
      { sub: userId, email, role, type: 'refresh' },
      { expiresIn: refreshTokenExpirySeconds },
    );

    const now = Math.floor(Date.now() / 1000);
    const expTime = now + accessTokenExpirySeconds;

    return {
      accessToken,
      refreshToken,
      user: {
        sub: userId,
        email,
        role,
        profileId,
        iat: now,
        exp: expTime,
      },
    };
  }

  private async resolveProfileId(
    userId: string,
    role: string,
  ): Promise<{ profileId: string | null; department?: string }> {
    try {
      switch (role) {
        case UserRole.DEALER:
          return {
            profileId: (await this.dealersService.findByUserId(userId)).id,
          };
        case UserRole.COORDINATOR: {
          const coord = await this.coordinatorsService.findByUserId(userId);
          const dept =
            typeof coord.department === 'string' ? coord.department : undefined;
          return { profileId: coord.id, department: dept };
        }
        case UserRole.TECHNICIAN:
          return {
            profileId: (await this.techniciansService.findByUserId(userId)).id,
          };
        default:
          return { profileId: null };
      }
    } catch (profileError) {
      this.logger.warn(
        `Failed to resolve profile for user ${userId}: ${extractErrorMessage(profileError)}`,
      );
      return { profileId: null };
    }
  }

  private parseExpiryToSeconds(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 900;
    const value = parseInt(match[1], 10);
    switch (match[2]) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 900;
    }
  }
}
