import { LiveReactionsRealtimeService } from './live-reactions-realtime.service';

describe('LiveReactionsRealtimeService public viewers', () => {
  it('creates a read-only anonymous principal when no access token is supplied', async () => {
    const service = new LiveReactionsRealtimeService(
      { verifyAsync: jest.fn() } as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.authenticate({
        id: 'socket-1',
        handshake: { auth: {}, query: {} },
      } as never),
    ).resolves.toEqual({
      userId: 'anonymous:socket-1',
      role: 'anonymous',
      authenticated: false,
    });
  });
});
