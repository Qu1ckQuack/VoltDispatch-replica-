jest.mock('../common/prisma.service.js', () => ({
  PrismaService: class {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { LocationGateway } from './location.gateway.js';
import { LocationCacheService } from './location-cache.service.js';
import { WsAuthService } from './services/ws-auth.service.js';
import { PrismaService } from '../common/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';

function createMockWs(): any {
  return {
    readyState: 1,
    OPEN: 1,
    send: jest.fn(),
    close: jest.fn(),
  };
}

describe('LocationGateway', () => {
  let gateway: LocationGateway;

  const mockWsAuthVerify = jest.fn();
  const mockCacheSetPosition = jest.fn();
  const mockCacheGetPosition = jest.fn();
  const mockRedisPublish = jest.fn();
  const mockRedisGetClient = jest.fn();
  const mockRedisCreateSubscriber = jest.fn();
  const mockPrismaWorkOrderFindMany = jest.fn();
  const mockPrismaWorkOrderFindFirst = jest.fn();
  const mockPrismaWorkOrderFindUnique = jest.fn();
  const mockPrismaTechnicianUpdate = jest.fn();

  beforeEach(async () => {
    mockWsAuthVerify.mockReset();
    mockCacheSetPosition.mockReset();
    mockCacheGetPosition.mockReset();
    mockRedisPublish.mockReset();
    mockRedisGetClient.mockReset();
    mockRedisCreateSubscriber.mockReset();
    mockPrismaWorkOrderFindMany.mockReset();
    mockPrismaWorkOrderFindFirst.mockReset();
    mockPrismaWorkOrderFindUnique.mockReset();
    mockPrismaTechnicianUpdate.mockReset();

    mockRedisGetClient.mockReturnValue({ publish: mockRedisPublish });
    mockRedisCreateSubscriber.mockReturnValue({
      on: jest.fn(),
      subscribe: jest.fn().mockResolvedValue(undefined),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationGateway,
        {
          provide: WsAuthService,
          useValue: { verify: mockWsAuthVerify },
        },
        {
          provide: LocationCacheService,
          useValue: {
            setPosition: mockCacheSetPosition,
            getPosition: mockCacheGetPosition,
          },
        },
        {
          provide: PrismaService,
          useValue: {
            workOrder: {
              findMany: mockPrismaWorkOrderFindMany,
              findFirst: mockPrismaWorkOrderFindFirst,
              findUnique: mockPrismaWorkOrderFindUnique,
            },
            technician: {
              update: mockPrismaTechnicianUpdate,
            },
          },
        },
        {
          provide: RedisService,
          useValue: {
            getClient: mockRedisGetClient,
            createSubscriber: mockRedisCreateSubscriber,
          },
        },
      ],
    }).compile();

    gateway = module.get<LocationGateway>(LocationGateway);
    (gateway as any).server = {};

    await gateway.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleConnection', () => {
    it('should accept a valid token and auto-subscribe', async () => {
      const client = createMockWs();
      const url = 'http://localhost/ws/locations?token=valid';
      const request = new Request(url);

      mockWsAuthVerify.mockResolvedValue({
        id: 'user-1',
        role: 'TECHNICIAN',
        profileId: 'tech-1',
        email: 'tech@test.com',
      });
      mockPrismaWorkOrderFindMany.mockResolvedValue([]);

      await gateway.handleConnection(client, request);

      expect(mockWsAuthVerify).toHaveBeenCalledWith('valid', '');
      expect(client.send).toHaveBeenCalledWith(
        expect.stringContaining('"connected"'),
      );
    });

    it('should reject connection with missing token', async () => {
      const client = createMockWs();
      const url = 'http://localhost/ws/locations';
      const request = new Request(url);

      await gateway.handleConnection(client, request);

      expect(client.close).toHaveBeenCalledWith(4001, 'Missing token');
    });

    it('should reject connection with invalid token', async () => {
      const client = createMockWs();
      const url = 'http://localhost/ws/locations?token=bad';
      const request = new Request(url);

      mockWsAuthVerify.mockRejectedValue(new Error('Invalid token'));

      await gateway.handleConnection(client, request);

      expect(client.close).toHaveBeenCalledWith(4001, 'Invalid token');
    });
  });

  describe('handleDisconnect', () => {
    it('should sync position for technician on disconnect', async () => {
      const client = createMockWs();
      const url = 'http://localhost/ws/locations?token=valid';
      const request = new Request(url);

      mockWsAuthVerify.mockResolvedValue({
        id: 'user-1',
        role: 'TECHNICIAN',
        profileId: 'tech-1',
        email: 'tech@test.com',
      });
      mockPrismaWorkOrderFindMany.mockResolvedValue([]);
      await gateway.handleConnection(client, request);

      (client.send as jest.Mock).mockClear();
      mockCacheGetPosition.mockResolvedValue({
        lat: 13.756,
        lng: 100.501,
        timestamp: 1000,
      });

      await gateway.handleDisconnect(client);

      expect(mockPrismaTechnicianUpdate).toHaveBeenCalledWith({
        where: { id: 'tech-1' },
        data: {
          lastLat: 13.756,
          lastLng: 100.501,
          lastLocationAt: expect.any(Date),
        },
      });
    });

    it('should clean up rooms on disconnect', async () => {
      const client = createMockWs();
      const url = 'http://localhost/ws/locations?token=valid';
      const request = new Request(url);

      mockWsAuthVerify.mockResolvedValue({
        id: 'user-1',
        role: 'HQ',
        profileId: null,
        email: 'hq@test.com',
      });
      mockPrismaWorkOrderFindMany.mockResolvedValue([
        { id: 'order-1' },
        { id: 'order-2' },
      ]);
      await gateway.handleConnection(client, request);

      expect(
        (gateway as any).clientData.get(client).subscribedRooms.size,
      ).toBe(2);

      await gateway.handleDisconnect(client);

      expect((gateway as any).clientData.has(client)).toBe(false);
    });
  });

  describe('position:update', () => {
    it('should process position update for technician', async () => {
      const client = createMockWs();
      const url = 'http://localhost/ws/locations?token=valid';
      const request = new Request(url);

      mockWsAuthVerify.mockResolvedValue({
        id: 'user-1',
        role: 'TECHNICIAN',
        profileId: 'tech-1',
        email: 'tech@test.com',
      });
      mockPrismaWorkOrderFindMany.mockResolvedValue([]);
      mockCacheSetPosition.mockResolvedValue(undefined);
      mockRedisPublish.mockResolvedValue(1);
      await gateway.handleConnection(client, request);

      (gateway as any).rateLimits.set(client, {
        lastAcceptedTime: 0,
        consecutiveDrops: 0,
        dropWindowStart: 0,
        bannedUntil: 0,
      });

      (client.send as jest.Mock).mockClear();

      await gateway.handlePositionUpdate(client, {
        lat: 13.756,
        lng: 100.501,
        orderId: 'order-1',
      });

      expect(mockCacheSetPosition).toHaveBeenCalledWith(
        'tech-1',
        13.756,
        100.501,
        'order-1',
      );
      expect(mockRedisPublish).toHaveBeenCalledWith(
        'location:updates',
        expect.stringContaining('"technicianId":"tech-1"'),
      );
    });

    it('should reject position update from non-technician', async () => {
      const client = createMockWs();
      const url = 'http://localhost/ws/locations?token=valid';
      const request = new Request(url);

      mockWsAuthVerify.mockResolvedValue({
        id: 'user-2',
        role: 'HQ',
        profileId: null,
        email: 'hq@test.com',
      });
      mockPrismaWorkOrderFindMany.mockResolvedValue([]);
      await gateway.handleConnection(client, request);

      (client.send as jest.Mock).mockClear();

      await gateway.handlePositionUpdate(client, {
        lat: 13.756,
        lng: 100.501,
      });

      expect(client.send).toHaveBeenCalledWith(
        expect.stringContaining('Only technicians'),
      );
    });

    it('should drop duplicate position within 50m distance', async () => {
      const client = createMockWs();
      const url = 'http://localhost/ws/locations?token=valid';
      const request = new Request(url);

      mockWsAuthVerify.mockResolvedValue({
        id: 'user-1',
        role: 'TECHNICIAN',
        profileId: 'tech-1',
        email: 'tech@test.com',
      });
      mockPrismaWorkOrderFindMany.mockResolvedValue([]);
      mockCacheSetPosition.mockResolvedValue(undefined);
      mockRedisPublish.mockResolvedValue(1);
      await gateway.handleConnection(client, request);

      (gateway as any).rateLimits.set(client, {
        lastAcceptedTime: 0,
        consecutiveDrops: 0,
        dropWindowStart: 0,
        bannedUntil: 0,
      });

      await gateway.handlePositionUpdate(client, {
        lat: 13.756,
        lng: 100.501,
      });
      expect(mockCacheSetPosition).toHaveBeenCalledTimes(1);

      await gateway.handlePositionUpdate(client, {
        lat: 13.756,
        lng: 100.501,
      });
      expect(mockCacheSetPosition).toHaveBeenCalledTimes(1);
    });

    it('should rate limit and ban after 10 consecutive drops', async () => {
      const client = createMockWs();
      const url = 'http://localhost/ws/locations?token=valid';
      const request = new Request(url);

      mockWsAuthVerify.mockResolvedValue({
        id: 'user-1',
        role: 'TECHNICIAN',
        profileId: 'tech-1',
        email: 'tech@test.com',
      });
      mockPrismaWorkOrderFindMany.mockResolvedValue([]);
      await gateway.handleConnection(client, request);

      const rlState = {
        lastAcceptedTime: 0,
        consecutiveDrops: 0,
        dropWindowStart: Date.now(),
        bannedUntil: 0,
      };
      (gateway as any).rateLimits.set(client, rlState);

      mockCacheSetPosition.mockResolvedValue(undefined);
      mockRedisPublish.mockResolvedValue(1);
      await gateway.handlePositionUpdate(client, { lat: 13.756, lng: 100.501 });

      rlState.lastAcceptedTime = Date.now() + 100000;
      rlState.consecutiveDrops = 0;

      for (let i = 0; i < 10; i++) {
        await gateway.handlePositionUpdate(client, {
          lat: 13.756 + i * 0.001,
          lng: 100.501,
        });
      }

      expect(client.close).toHaveBeenCalledWith(4003, 'Rate limited');
    });
  });

  describe('subscribe', () => {
    it('should subscribe to an allowed room', async () => {
      const client = createMockWs();
      const url = 'http://localhost/ws/locations?token=valid';
      const request = new Request(url);

      mockWsAuthVerify.mockResolvedValue({
        id: 'user-1',
        role: 'HQ',
        profileId: null,
        email: 'hq@test.com',
      });
      mockPrismaWorkOrderFindMany.mockResolvedValue([]);
      await gateway.handleConnection(client, request);

      (client.send as jest.Mock).mockClear();

      await gateway.handleSubscribe(client, { room: 'room:order:order-1' });

      expect(client.send).toHaveBeenCalledWith(
        expect.stringContaining('"subscribed"'),
      );
      expect(
        (gateway as any).clientData.get(client).subscribedRooms.has(
          'room:order:order-1',
        ),
      ).toBe(true);
    });

    it('should reject subscribe to unrecognized room pattern', async () => {
      const client = createMockWs();
      const url = 'http://localhost/ws/locations?token=valid';
      const request = new Request(url);

      mockWsAuthVerify.mockResolvedValue({
        id: 'user-1',
        role: 'HQ',
        profileId: null,
        email: 'hq@test.com',
      });
      mockPrismaWorkOrderFindMany.mockResolvedValue([]);
      await gateway.handleConnection(client, request);

      (client.send as jest.Mock).mockClear();

      await gateway.handleSubscribe(client, { room: 'invalid-room' });

      expect(client.send).toHaveBeenCalledWith(
        expect.stringContaining('Access denied'),
      );
    });

    it('should reject subscribe for customer not owning the order', async () => {
      const client = createMockWs();
      const url = 'http://localhost/ws/locations?token=valid';
      const request = new Request(url);

      mockWsAuthVerify.mockResolvedValue({
        id: 'cust-1',
        role: 'CUSTOMER',
        profileId: null,
        email: 'cust@test.com',
      });
      mockPrismaWorkOrderFindMany.mockResolvedValue([]);
      mockPrismaWorkOrderFindFirst.mockResolvedValue(null);
      await gateway.handleConnection(client, request);

      (client.send as jest.Mock).mockClear();

      await gateway.handleSubscribe(client, { room: 'room:order:order-1' });

      expect(client.send).toHaveBeenCalledWith(
        expect.stringContaining('Access denied'),
      );
    });
  });

  describe('unsubscribe', () => {
    it('should remove client from room', async () => {
      const client = createMockWs();
      const url = 'http://localhost/ws/locations?token=valid';
      const request = new Request(url);

      mockWsAuthVerify.mockResolvedValue({
        id: 'user-1',
        role: 'HQ',
        profileId: null,
        email: 'hq@test.com',
      });
      mockPrismaWorkOrderFindMany.mockResolvedValue([]);
      await gateway.handleConnection(client, request);

      await gateway.handleSubscribe(client, { room: 'room:order:order-1' });
      expect(
        (gateway as any).clientData.get(client).subscribedRooms.size,
      ).toBe(1);

      gateway.handleUnsubscribe(client, { room: 'room:order:order-1' });

      expect(
        (gateway as any).clientData.get(client).subscribedRooms.size,
      ).toBe(0);
    });
  });
});
