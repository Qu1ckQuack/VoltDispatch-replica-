import { Injectable, Logger } from '@nestjs/common';
import type { WebSocket } from 'ws';

interface RateLimitState {
  lastAcceptedTime: number;
  consecutiveDrops: number;
  dropWindowStart: number;
  bannedUntil: number;
}

const MIN_POSITION_INTERVAL_MS = 5000;
const MAX_CONSECUTIVE_DROPS = 10;
const DROP_WINDOW_MS = 60000;
const RATE_LIMIT_BAN_MS = 60000;

@Injectable()
export class PositionRateLimiterService {
  private readonly logger = new Logger(PositionRateLimiterService.name);
  private readonly rateLimits = new Map<WebSocket, RateLimitState>();

  init(client: WebSocket): void {
    this.rateLimits.set(client, {
      lastAcceptedTime: 0,
      consecutiveDrops: 0,
      dropWindowStart: Date.now(),
      bannedUntil: 0,
    });
  }

  check(client: WebSocket): boolean {
    const state = this.rateLimits.get(client);
    if (!state) return false;

    const now = Date.now();

    if (state.bannedUntil > now) return false;

    const timeSinceLastAccept = now - state.lastAcceptedTime;

    if (timeSinceLastAccept < MIN_POSITION_INTERVAL_MS) {
      state.consecutiveDrops++;

      if (now - state.dropWindowStart > DROP_WINDOW_MS) {
        state.consecutiveDrops = 1;
        state.dropWindowStart = now;
      }

      if (state.consecutiveDrops >= MAX_CONSECUTIVE_DROPS) {
        state.bannedUntil = now + RATE_LIMIT_BAN_MS;
        this.logger.warn('WS client rate-limited (too many drops)');
        client.close(4003, 'Rate limited');
      }

      return false;
    }

    state.lastAcceptedTime = now;

    if (now - state.dropWindowStart > DROP_WINDOW_MS) {
      state.consecutiveDrops = 0;
      state.dropWindowStart = now;
    }

    return true;
  }

  reset(client: WebSocket): void {
    this.rateLimits.delete(client);
  }

  getState(client: WebSocket): RateLimitState | undefined {
    return this.rateLimits.get(client);
  }
}
