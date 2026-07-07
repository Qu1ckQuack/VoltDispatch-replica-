import { Test, TestingModule } from '@nestjs/testing';
import { LocationCacheService } from './location-cache.service.js';
import { RedisService } from '../redis/redis.service.js';

const mockSetex = jest.fn<Promise<string>, [string, number, string]>();
const mockGet = jest.fn<Promise<string | null>, [string]>();
const mockMget = jest.fn<Promise<(string | null)[]>, [string[]]>();
const mockSadd = jest.fn<Promise<number>, [string, string]>();
const mockSmembers = jest.fn<Promise<string[]>, [string]>();

describe('LocationCacheService', () => {
  let service: LocationCacheService;

  beforeEach(async () => {
    mockSetex.mockReset();
    mockGet.mockReset();
    mockSadd.mockReset();
    mockSmembers.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationCacheService,
        {
          provide: RedisService,
          useValue: {
            getClient: jest.fn(() => ({
              setex: mockSetex,
              get: mockGet,
              mget: mockMget,
              sadd: mockSadd,
              smembers: mockSmembers,
            })),
            get: mockGet,
          },
        },
      ],
    }).compile();

    service = module.get<LocationCacheService>(LocationCacheService);
  });

  it('should set position with TTL and add to active set', async () => {
    mockSetex.mockResolvedValue('OK');
    mockSadd.mockResolvedValue(1);

    await service.setPosition('tech-1', 13.756, 100.501, 'order-1');

    expect(mockSetex).toHaveBeenCalledWith(
      'location:tech:tech-1',
      300,
      expect.stringContaining('"lat":13.756'),
    );
    expect(mockSadd).toHaveBeenCalledWith('location:active:techs', 'tech-1');
  });

  it('should get position', async () => {
    mockGet.mockResolvedValue(
      JSON.stringify({ lat: 13.756, lng: 100.501, timestamp: 1000 }),
    );

    const pos = await service.getPosition('tech-1');

    expect(pos).toBeDefined();
    expect(pos!.lat).toBe(13.756);
    expect(pos!.lng).toBe(100.501);
    expect(mockGet).toHaveBeenCalledWith('location:tech:tech-1');
  });

  it('should return null for missing position', async () => {
    mockGet.mockResolvedValue(null);

    const pos = await service.getPosition('tech-nonexistent');

    expect(pos).toBeNull();
  });

  it('should return null for invalid JSON in cache', async () => {
    mockGet.mockResolvedValue('not-json');

    const pos = await service.getPosition('tech-bad');

    expect(pos).toBeNull();
  });

  it('should list active technician IDs', async () => {
    mockSmembers.mockResolvedValue(['tech-1', 'tech-2']);

    const ids = await service.getActiveTechnicianIds();

    expect(ids).toEqual(['tech-1', 'tech-2']);
    expect(mockSmembers).toHaveBeenCalledWith('location:active:techs');
  });

  it('should return empty map when no active techs', async () => {
    mockSmembers.mockResolvedValue([]);

    const positions = await service.getActivePositions();

    expect(positions.size).toBe(0);
    expect(mockMget).not.toHaveBeenCalled();
  });

  it('should get active positions for all active techs via MGET', async () => {
    mockSmembers.mockResolvedValue(['tech-1', 'tech-2']);
    mockMget.mockResolvedValue([
      JSON.stringify({ lat: 13.756, lng: 100.501, timestamp: 1000 }),
      JSON.stringify({ lat: 13.757, lng: 100.502, timestamp: 2000 }),
    ]);

    const positions = await service.getActivePositions();

    expect(positions.size).toBe(2);
    expect(positions.get('tech-1')!.lat).toBe(13.756);
    expect(positions.get('tech-2')!.lat).toBe(13.757);
    expect(mockMget).toHaveBeenCalledWith(
      'location:tech:tech-1',
      'location:tech:tech-2',
    );
  });
});
