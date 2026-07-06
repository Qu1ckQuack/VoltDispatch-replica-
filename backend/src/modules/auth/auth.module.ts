import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { MagicLinkService } from './services/magic-link.service.js';
import { UsersModule } from '../users/users.module.js';
import { CustomersModule } from '../customers/customers.module.js';
import { DealersModule } from '../dealers/dealers.module.js';
import { TechniciansModule } from '../technicians/technicians.module.js';
import { CoordinatorsModule } from '../coordinators/coordinators.module.js';

@Module({
  imports: [
    UsersModule,
    CustomersModule,
    DealersModule,
    TechniciansModule,
    CoordinatorsModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, MagicLinkService],
  exports: [AuthService],
})
export class AuthModule {}
