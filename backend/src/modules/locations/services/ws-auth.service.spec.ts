import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedAppException } from '../../common/errors/app-exception.js';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { WsAuthService } from './ws-auth.service.js';
import { TokenRevokeService } from '../../common/services/token-revoke.service.js';

describe('WsAuthService', () => {
  let service: WsAuthService;

  const mockJwtVerify = jest.fn();
  const mockConfigGet = jest.fn();
  const mockIsRevoked = jest.fn();

  beforeEach(async () => {
    mockJwtVerify.mockReset();
    mockConfigGet.mockReset();
    mockIsRevoked.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WsAuthService,
        {
          provide: JwtService,
          useValue: { verify: mockJwtVerify },
        },
        {
          provide: ConfigService,
          useValue: { get: mockConfigGet },
        },
        {
          provide: TokenRevokeService,
          useValue: { isRevoked: mockIsRevoked },
        },
      ],
    }).compile();

    service = module.get<WsAuthService>(WsAuthService);
  });

  it('should verify a valid access token', async () => {
    mockConfigGet.mockReturnValue('http://localhost:3000');
    mockJwtVerify.mockReturnValue({
      sub: 'user-1',
      email: 'tech@test.com',
      role: 'TECHNICIAN',
      type: 'access',
      profileId: 'profile-1',
    });
    mockIsRevoked.mockResolvedValue(false);

    const user = await service.verify('valid-token', 'http://localhost:3000');

    expect(user.id).toBe('user-1');
    expect(user.role).toBe('TECHNICIAN');
    expect(user.profileId).toBe('profile-1');
  });

  it('should reject request from disallowed origin', async () => {
    mockConfigGet.mockReturnValue('http://localhost:3000');

    await expect(service.verify('token', 'http://evil.com')).rejects.toThrow(
      UnauthorizedAppException,
    );
  });

  it('should verify a customer token', async () => {
    mockConfigGet.mockReturnValue('http://localhost:3000');
    mockJwtVerify.mockReturnValue({
      sub: 'cust-1',
      email: 'cust@test.com',
      role: '',
      type: 'customer',
      name: 'John',
    });

    const user = await service.verify('cust-token', 'http://localhost:3000');

    expect(user.id).toBe('cust-1');
    expect(user.role).toBe('CUSTOMER');
    expect(user.name).toBe('John');
  });

  it('should reject revoked access token', async () => {
    mockConfigGet.mockReturnValue('http://localhost:3000');
    mockJwtVerify.mockReturnValue({
      sub: 'user-1',
      email: 'tech@test.com',
      role: 'TECHNICIAN',
      type: 'access',
    });
    mockIsRevoked.mockResolvedValue(true);

    await expect(
      service.verify('revoked-token', 'http://localhost:3000'),
    ).rejects.toThrow(UnauthorizedAppException);
  });

  it('should reject expired or malformed token', async () => {
    mockConfigGet.mockReturnValue('http://localhost:3000');
    mockJwtVerify.mockImplementation(() => {
      throw new Error('jwt expired');
    });

    await expect(
      service.verify('bad-token', 'http://localhost:3000'),
    ).rejects.toThrow(UnauthorizedAppException);
  });

  it('should reject refresh token type', async () => {
    mockConfigGet.mockReturnValue('http://localhost:3000');
    mockJwtVerify.mockReturnValue({
      sub: 'user-1',
      email: 'test@test.com',
      role: 'TECHNICIAN',
      type: 'refresh',
    });

    await expect(
      service.verify('refresh-token', 'http://localhost:3000'),
    ).rejects.toThrow(UnauthorizedAppException);
  });

  it('should allow any origin when ALLOWED_ORIGINS is not set', async () => {
    mockConfigGet.mockReturnValue(undefined);
    mockJwtVerify.mockReturnValue({
      sub: 'user-1',
      email: 'tech@test.com',
      role: 'TECHNICIAN',
      type: 'access',
      profileId: 'profile-1',
    });
    mockIsRevoked.mockResolvedValue(false);

    const user = await service.verify('token', 'http://any-origin.com');

    expect(user.id).toBe('user-1');
  });
});
