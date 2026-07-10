import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { LocationCacheService } from '../location-cache.service.js';
import { PrismaService } from '../../common/prisma.service.js';

const SYNC_INTERVAL_MS = 60000;

@Injectable()
export class PositionSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PositionSyncService.name);
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly locationCache: LocationCacheService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit(): void {
    this.intervalHandle = setInterval(() => {
      this.syncActivePositions().catch((syncError) => {
        this.logger.error(`Position sync failed:`, syncError);
      });
    }, SYNC_INTERVAL_MS);
    this.logger.log(`Position sync started (interval: ${SYNC_INTERVAL_MS}ms)`);
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  async syncActivePositions(): Promise<void> {
    const positions = await this.locationCache.getActivePositions();

    if (positions.size === 0) return;

    this.logger.debug(
      `Syncing ${positions.size} active technician positions to Postgres`,
    );

    let updated = 0;
    let failed = 0;

    for (const [technicianId, pos] of positions) {
      try {
        await this.prisma.technician.update({
          where: { id: technicianId },
          data: {
            lastLat: pos.lat,
            lastLng: pos.lng,
            lastLocationAt: new Date(pos.timestamp),
          },
        });
        updated++;
      } catch (updateError) {
        failed++;
        this.logger.warn(
          `Failed to sync position for technician ${technicianId}: ${(updateError as Error).message}`,
          (updateError as Error).stack,
        );
      }
    }

    if (failed > 0) {
      this.logger.warn(`Position sync: ${updated} updated, ${failed} failed`);
    }
  }
}
