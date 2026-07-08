import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LocationGateway } from './location.gateway.js';
import { LocationService } from './location.service.js';
import { LocationCacheService } from './location-cache.service.js';
import { GeocodingCacheService } from './geocoding-cache.service.js';
import { WsAuthService } from './services/ws-auth.service.js';
import { PositionSyncService } from './services/position-sync.service.js';
import { RoomManagerService } from './services/room-manager.service.js';
import { PositionRateLimiterService } from './services/position-rate-limiter.service.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    LocationGateway,
    LocationService,
    LocationCacheService,
    GeocodingCacheService,
    WsAuthService,
    PositionSyncService,
    RoomManagerService,
    PositionRateLimiterService,
  ],
  exports: [LocationCacheService, GeocodingCacheService],
})
export class LocationsModule {}
