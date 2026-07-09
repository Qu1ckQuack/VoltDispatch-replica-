import { Injectable } from '@nestjs/common';
import { UnauthorizedAppException } from '../../common/errors/app-exception.js';
import { ErrorCodes } from '../../common/errors/error-codes.js';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service.js';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  type: string;
  name?: string;
  profileId?: string | null;
  department?: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly usersService: UsersService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.type === 'customer') {
      return {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        role: 'CUSTOMER',
      };
    }

    if (payload.type !== 'access') {
      throw new UnauthorizedAppException(
        'Invalid token type',
        ErrorCodes.AUTH_INVALID_TOKEN,
      );
    }

    const user = await this.usersService.findById(payload.sub);

    if (!user.isActive) {
      throw new UnauthorizedAppException(
        'Account is deactivated',
        ErrorCodes.AUTH_ACCOUNT_DEACTIVATED,
      );
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      phone: user.phone,
      profileId: payload.profileId ?? null,
      department: payload.department ?? null,
    };
  }
}
