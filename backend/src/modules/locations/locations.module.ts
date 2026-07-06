import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LocationGateway } from './location.gateway.js';
import { LocationCacheService } from './location-cache.service.js';
import { GeocodingCacheService } from './geocoding-cache.service.js';
import { WsAuthService } from './services/ws-auth.service.js';

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
    LocationCacheService,
    GeocodingCacheService,
    WsAuthService,
  ],
  exports: [LocationCacheService, GeocodingCacheService],
})
export class LocationsModule {}
