import { RealtimePresenceService } from './realtime-presence.service';

describe('RealtimePresenceService', () => {
  const configService = {
    getConfig: jest.fn(() => ({
      enabled: false,
      url: null,
      keyPrefix: 'acf-test',
      defaultTtlSeconds: 300,
      connectionName: 'test',
      mode: 'disabled',
    })),
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-04T00:00:00.000Z').getTime());
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('keeps a user online while any device session heartbeat is alive', async () => {
    const service = new RealtimePresenceService(configService as never);

    await service.heartbeat({ userId: 'user-1', sessionId: 'socket-1' });
    await service.heartbeat({ userId: 'user-1', sessionId: 'socket-2' });
    expect(await service.isUserOnline('user-1')).toBe(true);

    jest.advanceTimersByTime(44_000);
    expect(await service.isUserOnline('user-1')).toBe(true);

    await service.heartbeat({ userId: 'user-1', sessionId: 'socket-2' });
    jest.advanceTimersByTime(2_000);
    expect(await service.isUserOnline('user-1')).toBe(true);

    jest.advanceTimersByTime(46_000);
    expect(await service.isUserOnline('user-1')).toBe(false);
  });

  it('expires typing indicators independently from durable chat state', async () => {
    const service = new RealtimePresenceService(configService as never);

    await service.markTyping({ scope: 'chat:thread-1', userId: 'user-1', isTyping: true });
    expect(await service.listOnlineUserIds(['user-1'])).toEqual([]);

    jest.advanceTimersByTime(9_000);
    await service.markTyping({ scope: 'chat:thread-1', userId: 'user-1', isTyping: false });

    expect(await service.isUserOnline('user-1')).toBe(false);
  });

  it('counts unique live viewers across multiple sessions', async () => {
    const service = new RealtimePresenceService(configService as never);

    await service.addLiveViewer({ liveSessionId: 'live-1', userId: 'user-1', sessionId: 'a' });
    await service.addLiveViewer({ liveSessionId: 'live-1', userId: 'user-1', sessionId: 'b' });
    await service.addLiveViewer({ liveSessionId: 'live-1', userId: 'user-2', sessionId: 'c' });

    expect(await service.countLiveViewers('live-1')).toBe(2);

    jest.advanceTimersByTime(301_000);
    expect(await service.countLiveViewers('live-1')).toBe(0);
  });
});
