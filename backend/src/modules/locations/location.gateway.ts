import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import type { IncomingMessage } from 'http';
import type { Server, WebSocket } from 'ws';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  WsAuthService,
  type WsAuthenticatedUser,
} from './services/ws-auth.service.js';
import { LocationCacheService } from './location-cache.service.js';
import { LocationService } from './location.service.js';
import { UpdatePositionDto } from './dto/update-position.dto.js';
import { RedisService } from '../redis/redis.service.js';
import { RoomManagerService } from './services/room-manager.service.js';
import { PositionRateLimiterService } from './services/position-rate-limiter.service.js';

const LOCATION_UPDATES_CHANNEL = 'location:updates';
const HQ_ACTIVITIES_CHANNEL = 'hq:activities';
const MIN_DISTANCE_M = 50;

interface ClientData {
  user: WsAuthenticatedUser;
  lastProcessedPos?: { lat: number; lng: number };
}

@Injectable()
@WebSocketGateway({
  path: '/ws/locations',
  transports: ['websocket'],
  maxPayload: 2048,
})
export class LocationGateway
  implements
    OnModuleInit,
    OnModuleDestroy,
    OnGatewayConnection,
    OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(LocationGateway.name);
  private readonly clientData = new Map<WebSocket, ClientData>();

  constructor(
    private readonly wsAuthService: WsAuthService,
    private readonly locationCache: LocationCacheService,
    private readonly locationService: LocationService,
    private readonly redis: RedisService,
    private readonly roomManager: RoomManagerService,
    private readonly rateLimiter: PositionRateLimiterService,
  ) {}

  async onModuleInit(): Promise<void> {
    const subscriber = this.redis.createSubscriber();
    subscriber.on('error', (err) => {
      this.logger.error(`Redis subscriber error: ${err.message}`);
    });
    subscriber.on('message', (channel, message) => {
      this.handlePubSubMessage(channel, message);
    });
    try {
      await Promise.all([
        subscriber.subscribe(LOCATION_UPDATES_CHANNEL),
        subscriber.subscribe(HQ_ACTIVITIES_CHANNEL),
      ]);
      this.logger.log(
        `Subscribed to Redis channels: ${LOCATION_UPDATES_CHANNEL}, ${HQ_ACTIVITIES_CHANNEL}`,
      );
    } catch (subError) {
      this.logger.error(
        `Failed to subscribe to Redis channels: ${(subError as Error).message}`,
        (subError as Error).stack,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down — broadcasting reconnect hint');
    const hint = JSON.stringify({
      event: 'reconnect_hint',
      data: { reconnectAfterMs: 5000 },
    });
    for (const client of this.clientData.keys()) {
      if (client.readyState === client.OPEN) {
        client.send(hint);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  async handleConnection(
    client: WebSocket,
    request: IncomingMessage,
  ): Promise<void> {
    try {
      // Prefer token from Sec-WebSocket-Protocol header (more secure — avoids
      // token leaking into server logs via URL query params). Fall back to
      // query param for backward compatibility with existing clients.
      const protocolHeader =
        (request.headers['sec-websocket-protocol'] as string) ?? '';
      const url = new URL(request.url ?? '', 'http://localhost');
      const token =
        protocolHeader
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)[0] ?? url.searchParams.get('token');

      if (!token) {
        client.close(4001, 'Missing token');
        return;
      }

      const origin = (request.headers['origin'] as string) ?? '';
      const user = await this.wsAuthService.verify(token, origin);

      this.clientData.set(client, { user });
      this.rateLimiter.init(client);

      this.send(client, 'connected', { userId: user.id, role: user.role });
      await this.autoSubscribe(client, user);
      this.logger.debug(`WS connected: ${user.role}:${user.id}`);
    } catch (authError) {
      this.logger.warn(`WS connection rejected: ${(authError as Error).message}`);
      client.close(4001, (authError as Error).message);
    }
  }

  async handleDisconnect(client: WebSocket): Promise<void> {
    const data = this.clientData.get(client);
    if (data) {
      this.roomManager.unsubscribeAll(client);

      if (data.user.role === 'TECHNICIAN' && data.user.profileId) {
        await this.locationService.syncLastPositionToDb(data.user.profileId);
      }
    }
    this.clientData.delete(client);
    this.rateLimiter.reset(client);
  }

  @SubscribeMessage('position:update')
  async handlePositionUpdate(client: WebSocket, raw: unknown): Promise<void> {
    const data = this.clientData.get(client);
    if (!data) {
      client.close(4001, 'Not authenticated');
      return;
    }

    if (data.user.role !== 'TECHNICIAN') {
      this.send(client, 'error', {
        message: 'Only technicians can update position',
      });
      return;
    }

    if (!this.rateLimiter.check(client)) return;

    const profileId = data.user.profileId;
    if (!profileId) {
      this.send(client, 'error', { message: 'No technician profile' });
      return;
    }

    const dto = plainToInstance(UpdatePositionDto, raw);
    const errors = await validate(dto);
    if (errors.length > 0) {
      this.send(client, 'error', {
        message: 'Invalid position data',
        details: errors,
      });
      return;
    }

    if (
      data.lastProcessedPos &&
      this.locationService.haversineDistance(
        data.lastProcessedPos.lat,
        data.lastProcessedPos.lng,
        dto.lat,
        dto.lng,
      ) < MIN_DISTANCE_M
    ) {
      return;
    }

    const cachePromise = this.locationCache.setPosition(
      profileId,
      dto.lat,
      dto.lng,
      dto.orderId,
    );
    const pubPromise = this.redis.getClient().publish(
      LOCATION_UPDATES_CHANNEL,
      JSON.stringify({
        technicianId: profileId,
        lat: dto.lat,
        lng: dto.lng,
        timestamp: Date.now(),
        orderId: dto.orderId,
      }),
    );
    await Promise.all([cachePromise, pubPromise]);

    data.lastProcessedPos = { lat: dto.lat, lng: dto.lng };

    if (dto.orderId) {
      this.roomManager.broadcast(
        `room:order:${dto.orderId}`,
        'technician:position',
        {
          technicianId: profileId,
          lat: dto.lat,
          lng: dto.lng,
          timestamp: Date.now(),
        },
      );
    }
  }

  @SubscribeMessage('subscribe')
  async handleSubscribe(client: WebSocket, raw: unknown): Promise<void> {
    const data = this.clientData.get(client);
    if (!data) {
      client.close(4001, 'Not authenticated');
      return;
    }

    const payload = raw as { room?: string };
    if (!payload?.room || typeof payload.room !== 'string') {
      this.send(client, 'error', { message: 'Invalid room' });
      return;
    }

    const room = payload.room;
    const allowed = await this.locationService.validateRoomAccess(
      data.user,
      room,
    );
    if (!allowed) {
      this.send(client, 'error', { message: 'Access denied to this room' });
      return;
    }

    this.roomManager.subscribe(client, payload.room);
    this.send(client, 'subscribed', { room: payload.room });
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(client: WebSocket, raw: unknown): void {
    const data = this.clientData.get(client);
    if (!data) return;

    const payload = raw as { room?: string };
    if (!payload?.room || typeof payload.room !== 'string') return;

    this.roomManager.unsubscribe(client, payload.room);
  }

  private async autoSubscribe(
    client: WebSocket,
    user: WsAuthenticatedUser,
  ): Promise<void> {
    const orderIds = await this.locationService.autoSubscribeRooms(user);

    for (const id of orderIds) {
      this.roomManager.subscribe(client, `room:order:${id}`);
    }

    if (user.role === 'HQ') {
      this.roomManager.subscribe(client, 'room:hq:activities');
    }
  }

  private handlePubSubMessage(channel: string, message: string): void {
    try {
      if (channel === LOCATION_UPDATES_CHANNEL) {
        const parsed = JSON.parse(message) as {
          technicianId: string;
          lat: number;
          lng: number;
          timestamp: number;
          orderId?: string;
        };

        if (parsed.orderId) {
          this.roomManager.broadcast(
            `room:order:${parsed.orderId}`,
            'technician:position',
            {
              technicianId: parsed.technicianId,
              lat: parsed.lat,
              lng: parsed.lng,
              timestamp: parsed.timestamp,
            },
          );
        }
      } else if (channel === HQ_ACTIVITIES_CHANNEL) {
        this.roomManager.broadcast(
          'room:hq:activities',
          'hq:activity',
          JSON.parse(message) as Record<string, unknown>,
        );
      }
    } catch (msgError) {
      this.logger.warn(
        `Invalid pub/sub message on channel ${channel}: ${(msgError as Error).message}`,
      );
    }
  }

  private send(
    client: WebSocket,
    event: string,
    data: Record<string, unknown>,
  ): void {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify({ event, data }));
    }
  }
}
