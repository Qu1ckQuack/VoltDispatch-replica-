import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CustomersService } from '../../customers/customers.service.js';

const CUSTOMER_TOKEN_EXPIRY = '15m';

@Injectable()
export class MagicLinkService {
  constructor(
    private readonly customersService: CustomersService,
    private readonly jwtService: JwtService,
  ) {}

  async authenticate(token: string) {
    try {
      const customer = await this.customersService.consumeAccessToken(token);

      const accessToken = this.jwtService.sign(
        {
          sub: customer.id,
          email: customer.email,
          name: customer.name,
          role: 'CUSTOMER',
          type: 'customer',
        },
        { expiresIn: CUSTOMER_TOKEN_EXPIRY },
      );

      return {
        accessToken,
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
        },
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired magic link');
    }
  }
}
