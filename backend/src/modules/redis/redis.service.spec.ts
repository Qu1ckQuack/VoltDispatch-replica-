import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service.js';

jest.mock('ioredis', () => {
  const MockRedis = jest.fn(() => ({
    on: jest.fn(),
    setex: jest.fn().mockResolvedValue('OK'),
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1),
    quit: jest.fn().mockResolvedValue('OK'),
    sadd: jest.fn().mockResolvedValue(1),
    smembers: jest.fn().mockResolvedValue([]),
  }));
  return { Redis: MockRedis };
});

describe('RedisService', () => {
  let service: RedisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('redis://localhost:6379'),
          },
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should set a value with TTL', async () => {
    const spy = jest.spyOn(service.getClient(), 'setex');
    await service.set('key1', 'val1', 60);
    expect(spy).toHaveBeenCalledWith('key1', 60, 'val1');
  });

  it('should set a value without TTL', async () => {
    const spy = jest.spyOn(service.getClient(), 'set');
    await service.set('key2', 'val2');
    expect(spy).toHaveBeenCalledWith('key2', 'val2');
  });

  it('should get a value', async () => {
    const spy = jest
      .spyOn(service.getClient(), 'get')
      .mockResolvedValue('cached');
    const result = await service.get('key1');
    expect(result).toBe('cached');
    expect(spy).toHaveBeenCalledWith('key1');
  });

  it('should return null for missing key', async () => {
    const result = await service.get('nonexistent');
    expect(result).toBeNull();
  });

  it('should delete a key', async () => {
    const spy = jest.spyOn(service.getClient(), 'del');
    await service.del('key1');
    expect(spy).toHaveBeenCalledWith('key1');
  });

  it('should quit on module destroy', async () => {
    const spy = jest.spyOn(service.getClient(), 'quit');
    await service.onModuleDestroy();
    expect(spy).toHaveBeenCalled();
  });
});
