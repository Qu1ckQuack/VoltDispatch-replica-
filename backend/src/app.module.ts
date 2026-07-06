import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { CommonModule } from './modules/common/common.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { DealersModule } from './modules/dealers/dealers.module.js';
import { CoordinatorsModule } from './modules/coordinators/coordinators.module.js';
import { TechniciansModule } from './modules/technicians/technicians.module.js';
import { CustomersModule } from './modules/customers/customers.module.js';
import { WorkOrdersModule } from './modules/work-orders/work-orders.module.js';
import { DevicesModule } from './modules/devices/devices.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 1000,
        limit: 10,
      },
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    AuthModule,
    UsersModule,
    CommonModule,
    CustomersModule,
    DealersModule,
    CoordinatorsModule,
    TechniciansModule,
    WorkOrdersModule,
    DevicesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useFactory: () =>
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
    },
  ],
})
export class AppModule {}
