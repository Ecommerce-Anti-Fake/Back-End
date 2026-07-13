import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthRpcService } from './auth-rpc.service';
import type { Request, Response } from 'express';

describe('AuthController refresh cookie contract', () => {
  let nodeEnv: string | undefined;
  const authRpcService = {
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
      expect.objectContaining({ secure: true, sameSite: 'none', path: '/api/auth' }),
    );
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

    expect(authRpcService.refresh).toHaveBeenCalledWith({ refreshToken: 'old-refresh-token' });
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

    expect(authRpcService.logout).toHaveBeenCalledWith({ refreshToken: 'refresh-token' });
    expect(response.clearCookie).toHaveBeenCalledWith(
      'eaf_refresh_token',
      expect.objectContaining({ secure: true, sameSite: 'none', path: '/api/auth' }),
    );
  });
});
