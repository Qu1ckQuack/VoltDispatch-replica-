import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { rlsStorage, type RlsUser } from '../services/rls-context.js';

@Injectable()
export class RlsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      user?: Record<string, unknown>;
    }>();
    const user = request.user;
    if (!user) {
      return next.handle();
    }

    let customerId: string | null = null;
    let profileId: string | null = null;
    let department: string | null = null;

    if (user.role === 'CUSTOMER') {
      customerId = user.id as string;
    } else if (user.profileId) {
      profileId = user.profileId as string;
      if (user.department) {
        department = user.department as string;
      }
    }

    const rlsUser: RlsUser = {
      userId: user.id as string,
      role: user.role as string,
      profileId: profileId ?? undefined,
      customerId: customerId ?? undefined,
      department: department ?? undefined,
    };

    return new Observable((subscriber) => {
      rlsStorage.run(rlsUser, () => {
        next.handle().subscribe({
          next: (value) => subscriber.next(value),
          error: (err) => subscriber.error(err),
          complete: () => subscriber.complete(),
        });
      });
    });
  }
}
