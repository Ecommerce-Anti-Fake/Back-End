import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  const prismaMock = {
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    authSession: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const jwtServiceMock = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const configServiceMock = {
    get: jest.fn((key: string) => {
      if (key === 'REFRESH_TOKEN_SECRET') return 'refresh-secret';
      if (key === 'REFRESH_TOKEN_TTL') return '7d';
      return undefined;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: jwtServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('register should reject when email and phone are both missing', async () => {
    await expect(service.register({ password: '12345678' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('register should reject when email already exists', async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce({ id: 'existing-user' });

    await expect(
      service.register({
        email: 'user@example.com',
        password: '12345678',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('validateUser should reject inactive accounts', async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce({
      id: 'user-1',
      email: 'user@example.com',
      password: 'salt:hash',
      role: 'user',
      accountStatus: 'blocked',
    });

    await expect(service.validateUser('user@example.com', '12345678')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('login should reject invalid credentials', async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce(null);

    await expect(
      service.login({ username: 'user@example.com', password: '12345678' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('login should return access token, refresh token, and safe user payload', async () => {
    const password = '12345678';
    const registeredPassword = await (service as any).hashPassword(password);

    prismaMock.user.findFirst.mockResolvedValueOnce({
      id: 'user-1',
      email: 'user@example.com',
      phone: null,
      displayName: 'User',
      password: registeredPassword,
      role: 'user',
      accountStatus: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prismaMock.authSession.create.mockResolvedValueOnce({ id: 'session-1' });
    prismaMock.authSession.update.mockResolvedValue({});
    jwtServiceMock.signAsync.mockResolvedValueOnce('access-token').mockResolvedValueOnce(
      'refresh-token',
    );

    const result = await service.login({ username: 'USER@example.com', password });

    expect(prismaMock.authSession.create).toHaveBeenCalled();
    expect(prismaMock.authSession.update).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: {
        currentTokenHash: expect.any(String),
      },
    });
    expect(result).toMatchObject({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: {
        id: 'user-1',
        email: 'user@example.com',
        role: 'user',
        accountStatus: 'active',
      },
    });
    expect(result.user).not.toHaveProperty('password');
  });

  it('refresh should rotate tokens when the current refresh token is valid', async () => {
    const oldRefreshToken = 'old-refresh-token';
    const session = {
      id: 'session-1',
      userId: 'user-1',
      tokenFamily: 'family-1',
      currentTokenId: 'token-1',
      currentTokenHash: (service as any).hashOpaqueToken(oldRefreshToken),
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
    };

    jwtServiceMock.verifyAsync.mockResolvedValueOnce({
      sub: 'user-1',
      sid: 'session-1',
      jti: 'token-1',
      typ: 'refresh',
    });
    prismaMock.authSession.findUnique.mockResolvedValueOnce(session);
    prismaMock.authSession.update.mockResolvedValue({});
    jwtServiceMock.signAsync.mockResolvedValueOnce('new-access-token').mockResolvedValueOnce(
      'new-refresh-token',
    );

    const result = await service.refresh({ refreshToken: oldRefreshToken });

    expect(result).toMatchObject({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      user: {
        id: 'user-1',
        email: 'user@example.com',
      },
    });
    expect(prismaMock.authSession.update).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: {
        currentTokenId: expect.any(String),
        currentTokenHash: expect.any(String),
        expiresAt: expect.any(Date),
        lastUsedAt: expect.any(Date),
      },
    });
  });

  it('refresh should revoke the session when refresh token reuse is detected', async () => {
    const staleRefreshToken = 'stale-refresh-token';
    const session = {
      id: 'session-1',
      currentTokenId: 'token-2',
      currentTokenHash: (service as any).hashOpaqueToken('latest-refresh-token'),
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
    };

    jwtServiceMock.verifyAsync.mockResolvedValueOnce({
      sub: 'user-1',
      sid: 'session-1',
      jti: 'token-1',
      typ: 'refresh',
    });
    prismaMock.authSession.findUnique.mockResolvedValueOnce(session);
    prismaMock.authSession.update.mockResolvedValue({});

    await expect(service.refresh({ refreshToken: staleRefreshToken })).rejects.toThrow(
      UnauthorizedException,
    );
    expect(prismaMock.authSession.update).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: {
        revokedAt: expect.any(Date),
        reuseDetectedAt: expect.any(Date),
      },
    });
  });

  it('logout should revoke the current session for a valid refresh token', async () => {
    const refreshToken = 'refresh-token';
    const session = {
      id: 'session-1',
      currentTokenId: 'token-1',
      currentTokenHash: (service as any).hashOpaqueToken(refreshToken),
      revokedAt: null,
    };

    jwtServiceMock.verifyAsync.mockResolvedValueOnce({
      sub: 'user-1',
      sid: 'session-1',
      jti: 'token-1',
      typ: 'refresh',
    });
    prismaMock.authSession.findUnique.mockResolvedValueOnce(session);
    prismaMock.authSession.update.mockResolvedValue({});

    await expect(service.logout({ refreshToken })).resolves.toEqual({ loggedOut: true });
    expect(prismaMock.authSession.update).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: {
        revokedAt: expect.any(Date),
      },
    });
  });
});
