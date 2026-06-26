import { UnauthorizedException } from '@nestjs/common';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';

describe('OptionalJwtAuthGuard', () => {
  const jwtService = {
    verifyAsync: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('allows anonymous requests without setting a user', async () => {
    const request: { headers: Record<string, string>; user?: unknown } = { headers: {} };
    const guard = new OptionalJwtAuthGuard(jwtService as never);

    await expect(guard.canActivate(httpContext(request))).resolves.toBe(true);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    expect(request.user).toBeUndefined();
  });

  it('sets the authenticated user when an access token is supplied', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'viewer-1', role: 'buyer', typ: 'access' });
    const request: { headers: Record<string, string>; user?: unknown } = {
      headers: { authorization: 'Bearer access-token' },
    };
    const guard = new OptionalJwtAuthGuard(jwtService as never);

    await expect(guard.canActivate(httpContext(request))).resolves.toBe(true);
    expect(request.user).toEqual({ id: 'viewer-1', sub: 'viewer-1', role: 'buyer' });
  });

  it('rejects an invalid supplied token instead of treating it as anonymous', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid token'));
    const guard = new OptionalJwtAuthGuard(jwtService as never);

    await expect(
      guard.canActivate(httpContext({ headers: { authorization: 'Bearer invalid-token' } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

function httpContext(request: unknown) {
  return {
    getType: () => 'http',
    switchToHttp: () => ({ getRequest: () => request }),
  } as never;
}
