import { RealtimePublisherLeaseService } from './realtime-publisher-lease.service';
import { ServiceUnavailableException } from '@nestjs/common';

describe('RealtimePublisherLeaseService', () => {
  const config = {
    getConfig: () => ({
      enabled: false,
      mode: 'disabled',
      url: null,
      keyPrefix: 'test',
      defaultTtlSeconds: 300,
      connectionName: 'test',
    }),
  };

  it('allows only one publisher client per live session', async () => {
    const service = new RealtimePublisherLeaseService(config as never);

    await expect(
      service.claim({
        sessionId: 'live-1',
        requesterUserId: 'seller-1',
        clientId: 'client-1',
      }),
    ).resolves.toBe(true);
    await expect(
      service.claim({
        sessionId: 'live-1',
        requesterUserId: 'seller-1',
        clientId: 'client-1',
      }),
    ).resolves.toBe(true);
    await expect(
      service.claim({
        sessionId: 'live-1',
        requesterUserId: 'seller-1',
        clientId: 'client-2',
      }),
    ).resolves.toBe(false);
  });

  it('refreshes and releases only the matching publisher lease', async () => {
    const service = new RealtimePublisherLeaseService(config as never);
    await service.claim({
      sessionId: 'live-1',
      requesterUserId: 'seller-1',
      clientId: 'client-1',
    });

    await expect(
      service.heartbeat({
        sessionId: 'live-1',
        requesterUserId: 'seller-1',
        clientId: 'client-2',
      }),
    ).resolves.toBe(false);
    await expect(
      service.heartbeat({
        sessionId: 'live-1',
        requesterUserId: 'seller-1',
        clientId: 'client-1',
      }),
    ).resolves.toBe(true);
    await expect(
      service.release({
        sessionId: 'live-1',
        requesterUserId: 'seller-1',
        clientId: 'client-1',
      }),
    ).resolves.toBe(true);
    await expect(
      service.claim({
        sessionId: 'live-1',
        requesterUserId: 'seller-1',
        clientId: 'client-2',
      }),
    ).resolves.toBe(true);
  });

  it('force releases a terminal session lease', async () => {
    const service = new RealtimePublisherLeaseService(config as never);
    await service.claim({
      sessionId: 'live-1',
      requesterUserId: 'seller-1',
      clientId: 'client-1',
    });

    await service.forceRelease('live-1');

    await expect(
      service.claim({
        sessionId: 'live-1',
        requesterUserId: 'seller-1',
        clientId: 'client-2',
      }),
    ).resolves.toBe(true);
  });

  it('refuses the local fallback in production', async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const service = new RealtimePublisherLeaseService(config as never);

    try {
      await expect(
        service.claim({
          sessionId: 'live-1',
          requesterUserId: 'seller-1',
          clientId: 'client-1',
        }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    } finally {
      if (previousNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = previousNodeEnv;
      }
    }
  });
});
