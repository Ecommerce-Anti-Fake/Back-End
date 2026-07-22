import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthRpcService } from './auth-rpc.service';
import type { Request, Response } from 'express';

describe('AuthController refresh cookie contract', () => {
  let nodeEnv: string | undefined;
  const authRpcService = {
    register: jest.fn(),
    resumeRegistration: jest.fn(),
    googleRegister: jest.fn(),
    confirmRegistrationChallenge: jest.fn(),
    login: jest.fn(),
    firebaseLogin: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
  } as unknown as jest.Mocked<AuthRpcService>;
  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'REFRESH_TOKEN_TTL') {
        return '7d';
      }
      if (key === 'NODE_ENV') {
        return nodeEnv;
      }
      return undefined;
    }),
  } as unknown as jest.Mocked<ConfigService>;

  let controller: AuthController;
  let response: Pick<Response, 'cookie' | 'clearCookie'>;

  beforeEach(() => {
    jest.clearAllMocks();
    nodeEnv = undefined;
    controller = new AuthController(authRpcService, configService);
    response = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };
  });

  it('sets a cross-site refresh cookie in production', async () => {
    nodeEnv = 'production';
    authRpcService.login.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: {
        id: 'user-1',
        email: 'buyer@example.com',
        phone: null,
        displayName: 'Buyer',
        role: 'user',
        accountStatus: 'active',
      },
    });

    await controller.login(
      { username: 'buyer@example.com', password: '12345678' },
      response as Response,
    );

    expect(response.cookie).toHaveBeenCalledWith(
      'eaf_refresh_token',
      'refresh-token',
      expect.objectContaining({
        secure: true,
        sameSite: 'none',
        path: '/api/auth',
      }),
    );
  });

  it('keeps the registration token in an httpOnly cookie and omits it from registration JSON', async () => {
    authRpcService.register.mockResolvedValue({
      registrationToken: 'registration-1.secret',
      registration: {
        provider: 'LOCAL',
        email: 'buyer@example.com',
        phone: '0901234567',
        expiresAt: new Date('2026-07-23T00:00:00.000Z'),
      },
    });

    const result = await controller.register(
      {
        email: 'buyer@example.com',
        phone: '0901234567',
        displayName: 'Buyer',
        password: 'StrongPass123',
      },
      response as Response,
    );

    expect(response.cookie).toHaveBeenCalledWith(
      'eaf_registration_session',
      'registration-1.secret',
      expect.objectContaining({ httpOnly: true, path: '/api/auth' }),
    );
    expect(result).toEqual(
      expect.objectContaining({ registration: expect.any(Object) }),
    );
    expect(result).not.toHaveProperty('registrationToken');
  });

  it('resumes a pending registration with a fresh httpOnly registration cookie', async () => {
    authRpcService.resumeRegistration.mockResolvedValue({
      registrationToken: 'registration-2.secret',
      registration: {
        provider: 'LOCAL',
        email: 'buyer@example.com',
        phone: '0901234567',
        expiresAt: new Date('2026-07-23T00:00:00.000Z'),
      },
    });

    const result = await controller.resumeRegistration(
      { username: 'buyer@example.com', password: 'StrongPass123' },
      response as Response,
    );

    expect(authRpcService.resumeRegistration).toHaveBeenCalledWith({
      username: 'buyer@example.com',
      password: 'StrongPass123',
    });
    expect(response.cookie).toHaveBeenCalledWith(
      'eaf_registration_session',
      'registration-2.secret',
      expect.objectContaining({ httpOnly: true, path: '/api/auth' }),
    );
    expect(result).not.toHaveProperty('registrationToken');
  });

  it('keeps a Google link intent in an httpOnly cookie without creating another user', async () => {
    authRpcService.googleRegister.mockResolvedValue({
      kind: 'LINK_REQUIRED',
      linkToken: 'link-1.secret',
      email: 'buyer@example.com',
      expiresAt: new Date('2026-07-22T10:10:00.000Z'),
    });

    const result = await controller.googleRegister(
      { idToken: 'google-token' },
      response as Response,
    );

    expect(response.cookie).toHaveBeenCalledWith(
      'eaf_google_link_intent',
      'link-1.secret',
      expect.objectContaining({ httpOnly: true, path: '/api/auth' }),
    );
    expect(result).toMatchObject({
      kind: 'LINK_REQUIRED',
      email: 'buyer@example.com',
    });
    expect(result).not.toHaveProperty('linkToken');
  });

  it('sets refresh token in an httpOnly cookie and omits it from login response body', async () => {
    authRpcService.login.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: {
        id: 'user-1',
        email: 'buyer@example.com',
        phone: null,
        displayName: 'Buyer',
        role: 'user',
        accountStatus: 'active',
      },
    });

    const result = await controller.login(
      { username: 'buyer@example.com', password: '12345678' },
      response as Response,
    );

    expect(response.cookie).toHaveBeenCalledWith(
      'eaf_refresh_token',
      'refresh-token',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/api/auth',
      }),
    );
    expect(result).toEqual({
      accessToken: 'access-token',
      user: expect.objectContaining({ id: 'user-1' }),
    });
    expect(result).not.toHaveProperty('refreshToken');
  });

  it('refreshes using the httpOnly cookie and rotates the cookie without exposing the token', async () => {
    authRpcService.refresh.mockResolvedValue({
      accessToken: 'next-access-token',
      refreshToken: 'next-refresh-token',
      user: {
        id: 'user-1',
        email: 'buyer@example.com',
        phone: null,
        displayName: 'Buyer',
        role: 'user',
        accountStatus: 'active',
      },
    });

    const result = await controller.refresh(
      { headers: { cookie: 'eaf_refresh_token=old-refresh-token' } } as Request,
      response as Response,
    );

    expect(authRpcService.refresh).toHaveBeenCalledWith({
      refreshToken: 'old-refresh-token',
    });
    expect(response.cookie).toHaveBeenCalledWith(
      'eaf_refresh_token',
      'next-refresh-token',
      expect.objectContaining({ httpOnly: true }),
    );
    expect(result).toEqual({
      accessToken: 'next-access-token',
      user: expect.objectContaining({ id: 'user-1' }),
    });
    expect(result).not.toHaveProperty('refreshToken');
  });

  it('rejects refresh when the cookie is missing', async () => {
    await expect(
      controller.refresh({ headers: {} } as Request, response as Response),
    ).rejects.toThrow(UnauthorizedException);
    expect(authRpcService.refresh).not.toHaveBeenCalled();
  });

  it('logs out using the refresh cookie and clears it', async () => {
    nodeEnv = 'production';
    authRpcService.logout.mockResolvedValue({ loggedOut: true });

    await expect(
      controller.logout(
        { headers: { cookie: 'eaf_refresh_token=refresh-token' } } as Request,
        response as Response,
      ),
    ).resolves.toEqual({ loggedOut: true });

    expect(authRpcService.logout).toHaveBeenCalledWith({
      refreshToken: 'refresh-token',
    });
    expect(response.clearCookie).toHaveBeenCalledWith(
      'eaf_refresh_token',
      expect.objectContaining({
        secure: true,
        sameSite: 'none',
        path: '/api/auth',
      }),
    );
  });
});
