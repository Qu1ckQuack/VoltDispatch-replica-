import { Injectable, Logger } from '@nestjs/common';
import { UnauthorizedAppException } from '../../common/errors/app-exception.js';
import { ErrorCodes } from '../../common/errors/error-codes.js';
import { JwtService } from '@nestjs/jwt';
import { CustomersService } from '../../customers/customers.service.js';

const CUSTOMER_TOKEN_EXPIRY = '15m';

@Injectable()
export class MagicLinkService {
  private readonly logger = new Logger(MagicLinkService.name);

  constructor(
    private readonly customersService: CustomersService,
    private readonly jwtService: JwtService,
  ) {}

  async authenticate(token: string) {
    try {
      const customer = await this.customersService.consumeAccessToken(token);

      const activeOrder = customer.workOrders?.find(
        (wo: { status: string; id: string }) =>
          wo.status !== 'COMPLETED' && wo.status !== 'CANCELLED',
      );

      const accessToken = this.jwtService.sign(
        {
          sub: customer.id,
          email: customer.email,
          name: customer.name,
          role: 'CUSTOMER',
          type: 'customer',
          workOrderId: activeOrder?.id ?? null,
        },
        { expiresIn: CUSTOMER_TOKEN_EXPIRY },
      );

      return {
        accessToken,
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          workOrderId: activeOrder?.id ?? null,
        },
      };
    } catch (linkError) {
      this.logger.warn(`Magic link auth failed: ${(linkError as Error).message}`);
      throw new UnauthorizedAppException(
        'Invalid or expired magic link',
        ErrorCodes.AUTH_MAGIC_LINK_EXPIRED,
      );
    }
  }
}
