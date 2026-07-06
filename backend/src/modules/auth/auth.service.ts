import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service.js';
import { DealersService } from '../dealers/dealers.service.js';
import { TechniciansService } from '../technicians/technicians.service.js';
import { CoordinatorsService } from '../coordinators/coordinators.service.js';
import { MagicLinkService } from './services/magic-link.service.js';
import { TokenRevokeService } from '../common/services/token-revoke.service.js';
import { LoginDto } from './dto/login.dto.js';
import { UserRole } from '../../generated/prisma/enums.js';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly magicLinkService: MagicLinkService,
    private readonly tokenRevokeService: TokenRevokeService,
    private readonly dealersService: DealersService,
    private readonly techniciansService: TechniciansService,
    private readonly coordinatorsService: CoordinatorsService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      this.tokenRevokeService.revoke(user.id);
      throw new UnauthorizedException('Account is deactivated');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
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
        throw new UnauthorizedException('Invalid token type');
      }

      const user = await this.usersService.findById(payload.sub);

      if (!user.isActive) {
        this.tokenRevokeService.revoke(user.id);
        throw new UnauthorizedException('Account is deactivated');
      }

      return this.generateTokens(user.id, user.email, user.role);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async loginViaMagicLink(token: string) {
    return this.magicLinkService.authenticate(token);
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const profileId = await this.resolveProfileId(userId, role);

    const accessToken = this.jwtService.sign(
      { sub: userId, email, role, profileId, type: 'access' },
      { expiresIn: ACCESS_TOKEN_EXPIRY },
    );

    const refreshToken = this.jwtService.sign(
      { sub: userId, email, role, type: 'refresh' },
      { expiresIn: REFRESH_TOKEN_EXPIRY },
    );

    return { accessToken, refreshToken };
  }

  private async resolveProfileId(userId: string, role: string): Promise<string | null> {
    try {
      switch (role) {
        case UserRole.DEALER:
          return (await this.dealersService.findByUserId(userId)).id;
        case UserRole.COORDINATOR:
          return (await this.coordinatorsService.findByUserId(userId)).id;
        case UserRole.TECHNICIAN:
          return (await this.techniciansService.findByUserId(userId)).id;
        default:
          return null;
      }
    } catch {
      return null;
    }
  }
}
