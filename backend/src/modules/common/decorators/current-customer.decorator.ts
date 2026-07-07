import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentCustomer = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user?: { role?: string } }>();
    const user = request.user;
    if (user?.role === 'CUSTOMER') {
      return user;
    }
    return undefined;
  },
);
