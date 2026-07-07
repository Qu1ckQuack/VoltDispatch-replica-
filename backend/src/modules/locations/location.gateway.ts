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
import type { Server, WebSocket } from 'ws';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  WsAuthService,
  type WsAuthenticatedUser,
} from './services/ws-auth.service.js';
import { LocationCacheService } from './location-cache.service.js';
import { UpdatePositionDto } from './dto/update-position.dto.js';
import { PrismaService } from '../common/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { RoomManagerService } from './services/room-manager.service.js';
import { PositionRateLimiterService } from './services/position-rate-limiter.service.js';
import { WorkOrderStatus } from '../../generated/prisma/enums.js';

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
    private readonly prisma: PrismaService,
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
    } catch (err) {
      this.logger.error(
        `Failed to subscribe to Redis channels: ${(err as Error).message}`,
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

  async handleConnection(client: WebSocket, request: Request): Promise<void> {
    try {
      const url = new URL(request.url ?? '', 'http://localhost');
      const token = url.searchParams.get('token');
      if (!token) {
        client.close(4001, 'Missing token');
        return;
      }

      const origin = request.headers.get('origin') ?? '';
      const user = await this.wsAuthService.verify(token, origin);

      this.clientData.set(client, { user });
      this.rateLimiter.init(client);

      this.send(client, 'connected', { userId: user.id, role: user.role });
      await this.autoSubscribe(client, user);
      this.logger.debug(`WS connected: ${user.role}:${user.id}`);
    } catch (err) {
      this.logger.warn(`WS connection rejected: ${(err as Error).message}`);
      client.close(4001, (err as Error).message);
    }
  }

  async handleDisconnect(client: WebSocket): Promise<void> {
    const data = this.clientData.get(client);
    if (data) {
      this.roomManager.unsubscribeAll(client);

      // Sync last-known position to DB on disconnect.
      if (data.user.role === 'TECHNICIAN' && data.user.profileId) {
        await this.syncLastPositionToDb(data.user.profileId);
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
      this.haversineDistance(
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

    const allowed = await this.validateRoomAccess(data.user, payload.room);
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

  private async syncLastPositionToDb(technicianId: string): Promise<void> {
    try {
      const pos = await this.locationCache.getPosition(technicianId);
      if (pos) {
        await this.prisma.technician.update({
          where: { id: technicianId },
          data: {
            lastLat: pos.lat,
            lastLng: pos.lng,
            lastLocationAt: new Date(pos.timestamp),
          },
        });
      }
    } catch (err) {
      this.logger.warn(
        `Failed to sync position for technician ${technicianId}: ${(err as Error).message}`,
      );
    }
  }

  private haversineDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private async autoSubscribe(
    client: WebSocket,
    user: WsAuthenticatedUser,
  ): Promise<void> {
    let orderIds: string[] = [];

    switch (user.role) {
      case 'TECHNICIAN':
        if (user.profileId) {
          const active = await this.prisma.workOrder.findMany({
            where: {
              technicianId: user.profileId,
              status: {
                notIn: [WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED],
              },
            },
            select: { id: true },
          });
          orderIds = active.map((o) => o.id);
        }
        break;
      case 'CUSTOMER': {
        const orders = await this.prisma.workOrder.findMany({
          where: { customerId: user.id },
          select: { id: true },
        });
        orderIds = orders.map((o) => o.id);
        break;
      }
      case 'COORDINATOR': {
        const coordinator = await this.prisma.coordinator.findUnique({
          where: { userId: user.id },
          select: { department: true },
        });
        if (coordinator?.department) {
          const orders = await this.prisma.workOrder.findMany({
            where: {
              department: coordinator.department,
              status: {
                notIn: [WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED],
              },
            },
            select: { id: true },
          });
          orderIds = orders.map((o) => o.id);
        }
        break;
      }
      case 'HQ': {
        const orders = await this.prisma.workOrder.findMany({
          where: {
            status: {
              notIn: [WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED],
            },
          },
          select: { id: true },
          take: 50,
        });
        orderIds = orders.map((o) => o.id);

        this.roomManager.subscribe(client, 'room:hq:activities');
        break;
      }
    }

    for (const id of orderIds) {
      this.roomManager.subscribe(client, `room:order:${id}`);
    }
  }

  private async validateRoomAccess(
    user: WsAuthenticatedUser,
    room: string,
  ): Promise<boolean> {
    const orderMatch = room.match(/^room:order:(.+)$/);
    if (!orderMatch) return false;

    const orderId = orderMatch[1];

    switch (user.role) {
      case 'CUSTOMER': {
        const order = await this.prisma.workOrder.findFirst({
          where: { id: orderId, customerId: user.id },
        });
        return !!order;
      }
      case 'COORDINATOR': {
        const [order, coordinator] = await Promise.all([
          this.prisma.workOrder.findUnique({
            where: { id: orderId },
            select: { department: true },
          }),
          this.prisma.coordinator.findUnique({
            where: { userId: user.id },
            select: { department: true },
          }),
        ]);
        return (
          !!order &&
          !!coordinator &&
          order.department === coordinator.department
        );
      }
      case 'HQ':
        return true;
      default:
        return false;
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
    } catch (err) {
      this.logger.warn(
        `Invalid pub/sub message on channel ${channel}: ${(err as Error).message}`,
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
