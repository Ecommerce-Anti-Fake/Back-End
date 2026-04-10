import {
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtTokenAdapter } from '../../infrastructure/adapters/jwt-token.adapter';
import { AuthSessionRepository } from '../../infrastructure/persistence/auth-session.repository';
import { PasswordHasherService } from '../services/password-hasher.service';
import { RefreshTokenUseCase } from './refresh-token.use-case';

describe('RefreshTokenUseCase', () => {
  let useCase: RefreshTokenUseCase;

  const authSessionRepositoryMock = {
    findById: jest.fn(),
    update: jest.fn(),
  };

  const passwordHasherServiceMock = {
    verifyHashedValue: jest.fn(),
    hashOpaqueToken: jest.fn(),
  };

  const jwtTokenAdapterMock = {
    verifyRefreshToken: jest.fn(),
    generateAccessToken: jest.fn(),
    generateTokenId: jest.fn(),
    generateRefreshToken: jest.fn(),
    calculateRefreshExpiry: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenUseCase,
        { provide: AuthSessionRepository, useValue: authSessionRepositoryMock },
        { provide: PasswordHasherService, useValue: passwordHasherServiceMock },
        { provide: JwtTokenAdapter, useValue: jwtTokenAdapterMock },
      ],
    }).compile();

    useCase = module.get<RefreshTokenUseCase>(RefreshTokenUseCase);
  });

  it('should reject when the session does not exist', async () => {
    jwtTokenAdapterMock.verifyRefreshToken.mockResolvedValueOnce({
      sub: 'user-1',
      sid: 'session-1',
      jti: 'token-1',
      typ: 'refresh',
    });
    authSessionRepositoryMock.findById.mockResolvedValueOnce(null);

    await expect(useCase.execute({ refreshToken: 'refresh-token' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should reject when the account is not active', async () => {
    jwtTokenAdapterMock.verifyRefreshToken.mockResolvedValueOnce({
      sub: 'user-1',
      sid: 'session-1',
      jti: 'token-1',
      typ: 'refresh',
    });
    authSessionRepositoryMock.findById.mockResolvedValueOnce({
      id: 'session-1',
      currentTokenId: 'token-1',
      currentTokenHash: 'hashed-refresh-token',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      user: {
        id: 'user-1',
        email: 'user@example.com',
        phone: null,
        displayName: 'User',
        role: 'user',
        accountStatus: 'blocked',
      },
    });
    authSessionRepositoryMock.update.mockResolvedValue({});

    await expect(useCase.execute({ refreshToken: 'refresh-token' })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should rotate tokens when the current refresh token is valid', async () => {
    jwtTokenAdapterMock.verifyRefreshToken.mockResolvedValueOnce({
      sub: 'user-1',
      sid: 'session-1',
      jti: 'token-1',
      typ: 'refresh',
    });
    authSessionRepositoryMock.findById.mockResolvedValueOnce({
      id: 'session-1',
      userId: 'user-1',
      tokenFamily: 'family-1',
      currentTokenId: 'token-1',
      currentTokenHash: 'hashed-old-refresh-token',
      expiresAt: new Date(Date.now() + 60_000),
      lastUsedAt: null,
      revokedAt: null,
      reuseDetectedAt: null,
      user: {
        id: 'user-1',
        email: 'user@example.com',
        phone: null,
        displayName: 'User',
        role: 'user',
        accountStatus: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    passwordHasherServiceMock.verifyHashedValue.mockReturnValueOnce(true);
    authSessionRepositoryMock.update.mockResolvedValue({});
    jwtTokenAdapterMock.generateAccessToken.mockResolvedValueOnce('new-access-token');
    jwtTokenAdapterMock.generateTokenId.mockReturnValueOnce('new-token-id');
    jwtTokenAdapterMock.generateRefreshToken.mockResolvedValueOnce('new-refresh-token');
    jwtTokenAdapterMock.calculateRefreshExpiry.mockReturnValueOnce(new Date(Date.now() + 60_000));
    passwordHasherServiceMock.hashOpaqueToken.mockReturnValueOnce('hashed-new-refresh-token');

    const result = await useCase.execute({ refreshToken: 'old-refresh-token' });

    expect(result).toMatchObject({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      user: {
        id: 'user-1',
        email: 'user@example.com',
      },
    });
    expect(authSessionRepositoryMock.update).toHaveBeenCalledWith('session-1', {
      currentTokenId: 'new-token-id',
      currentTokenHash: 'hashed-new-refresh-token',
      expiresAt: expect.any(Date),
      lastUsedAt: expect.any(Date),
    });
  });

  it('should reject refresh token reuse', async () => {
    jwtTokenAdapterMock.verifyRefreshToken.mockResolvedValueOnce({
      sub: 'user-1',
      sid: 'session-1',
      jti: 'token-1',
      typ: 'refresh',
    });
    authSessionRepositoryMock.findById.mockResolvedValueOnce({
      id: 'session-1',
      currentTokenId: 'token-2',
      currentTokenHash: 'hashed-latest-refresh-token',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      user: {
        id: 'user-1',
        email: 'user@example.com',
        phone: null,
        displayName: 'User',
        role: 'user',
        accountStatus: 'active',
      },
    });
    passwordHasherServiceMock.verifyHashedValue.mockReturnValueOnce(false);
    authSessionRepositoryMock.update.mockResolvedValue({});

    await expect(useCase.execute({ refreshToken: 'stale-refresh-token' })).rejects.toThrow(
      UnauthorizedException,
    );
    expect(authSessionRepositoryMock.update).toHaveBeenCalledWith('session-1', {
      revokedAt: expect.any(Date),
      reuseDetectedAt: expect.any(Date),
    });
  });
});
