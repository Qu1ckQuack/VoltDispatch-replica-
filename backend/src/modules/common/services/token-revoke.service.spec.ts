import { Test, TestingModule } from '@nestjs/testing';
import { TokenRevokeService } from './token-revoke.service.js';
import { RedisService } from '../../redis/redis.service.js';

const mockSet = jest.fn<Promise<void>, [string, string, number?]>();
const mockGet = jest.fn<Promise<string | null>, [string]>();

describe('TokenRevokeService', () => {
  let service: TokenRevokeService;

  beforeEach(async () => {
    mockSet.mockReset();
    mockGet.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenRevokeService,
        {
          provide: RedisService,
          useValue: { set: mockSet, get: mockGet },
        },
      ],
    }).compile();

    service = module.get<TokenRevokeService>(TokenRevokeService);
  });

  it('should revoke a user with 15-minute TTL', async () => {
    await service.revoke('user-1');
    expect(mockSet).toHaveBeenCalledWith('revoked:user:user-1', '1', 900);
  });

  it('should return true for revoked user', async () => {
    mockGet.mockResolvedValue('1');
    const result = await service.isRevoked('user-1');
    expect(result).toBe(true);
    expect(mockGet).toHaveBeenCalledWith('revoked:user:user-1');
  });

  it('should return false for non-revoked user', async () => {
    mockGet.mockResolvedValue(null);
    const result = await service.isRevoked('user-2');
    expect(result).toBe(false);
  });

  it('should return false after TTL expiry (simulated)', async () => {
    mockGet.mockResolvedValueOnce('1').mockResolvedValueOnce(null);
    expect(await service.isRevoked('user-1')).toBe(true);
    expect(await service.isRevoked('user-1')).toBe(false);
  });
});
