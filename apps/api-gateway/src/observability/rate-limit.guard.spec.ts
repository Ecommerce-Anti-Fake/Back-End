import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { RateLimitGuard } from './rate-limit.guard';

function createContext(ip = '127.0.0.1'): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({
        method: 'POST',
        originalUrl: '/api/auth/login',
        headers: {},
        ip,
        socket: { remoteAddress: ip },
      }),
    }),
  } as ExecutionContext;
}

describe('RateLimitGuard', () => {
  it('allows requests when no rate limit metadata is present', () => {
    const guard = new RateLimitGuard(
      { getAllAndOverride: jest.fn().mockReturnValue(undefined) } as unknown as Reflector,
      { get: jest.fn() } as unknown as ConfigService,
    );

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('blocks after the configured limit inside the same window', () => {
    const guard = new RateLimitGuard(
      { getAllAndOverride: jest.fn().mockReturnValue({ profile: 'auth', limit: 1, windowMs: 60_000 }) } as unknown as Reflector,
      { get: jest.fn() } as unknown as ConfigService,
    );
    const context = createContext();

    expect(guard.canActivate(context)).toBe(true);
    expect(() => guard.canActivate(context)).toThrow('Too many requests');
  });
});
