import { Module, ValidationPipe } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { CommonModule } from './modules/common/common.module.js';
import { RlsInterceptor } from './modules/common/interceptors/rls.interceptor.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { DealersModule } from './modules/dealers/dealers.module.js';
import { CoordinatorsModule } from './modules/coordinators/coordinators.module.js';
import { TechniciansModule } from './modules/technicians/technicians.module.js';
import { CustomersModule } from './modules/customers/customers.module.js';
import { WorkOrdersModule } from './modules/work-orders/work-orders.module.js';
import { DevicesModule } from './modules/devices/devices.module.js';
import { RedisModule } from './modules/redis/redis.module.js';
import { LocationsModule } from './modules/locations/locations.module.js';
import { BullmqModule } from './modules/bullmq/bullmq.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { SlaModule } from './modules/sla/sla.module.js';
import { MediaModule } from './modules/media/media.module.js';
import { RatingsModule } from './modules/ratings/ratings.module.js';
import { ReportingModule } from './modules/reporting/reporting.module.js';
import { RegistrationModule } from './modules/registration/registration.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot({
      global: true,
    }),
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
    RedisModule,
    LocationsModule,
    AuthModule,
    UsersModule,
    CommonModule,
    CustomersModule,
    DealersModule,
    CoordinatorsModule,
    TechniciansModule,
    WorkOrdersModule,
    DevicesModule,
    BullmqModule,
    NotificationsModule,
    SlaModule,
    MediaModule,
    RatingsModule,
    ReportingModule,
    RegistrationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: RlsInterceptor,
    },
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
