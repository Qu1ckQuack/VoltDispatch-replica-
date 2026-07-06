import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { TokenRevokeService } from '../services/token-revoke.service.js';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenRevokeService: TokenRevokeService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const result = await super.canActivate(context);
    if (!result) {
      return false;
    }

    const request: Record<string, unknown> = context
      .switchToHttp()
      .getRequest();
    const user = request.user as { id: string } | undefined;
    if (user) {
      if (await this.tokenRevokeService.isRevoked(user.id)) {
        throw new UnauthorizedException('Token has been revoked');
      }
    }

    return true;
  }
}
