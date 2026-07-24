import { toLiveSessionResponse } from './live-commerce.mapper';

describe('toLiveSessionResponse', () => {
  it('never exposes provider identifiers or ingest credentials publicly', () => {
    const response = toLiveSessionResponse({
      id: 'live-1',
      shopId: 'shop-1',
      title: 'Live hang chinh hang',
      description: null,
      coverUrl: null,
      startAt: new Date('2026-07-25T02:00:00.000Z'),
      status: 'SCHEDULED',
      playbackUrl: 'https://customer.example.cloudflarestream.com/input/iframe',
      streamProvider: 'CLOUDFLARE_STREAM',
      streamProviderSessionId: 'cloudflare-input-id',
      streamIngestUrl: 'rtmps://live.cloudflare.com:443/live/secret-key',
      streamLatencyTargetMs: 8000,
      providerStatus: 'CONNECTED',
      actualStartedAt: new Date('2026-07-25T02:01:00.000Z'),
      actualEndedAt: null,
      recordingUrl: null,
      recordingRetentionDays: 30,
      createdAt: new Date('2026-07-24T02:00:00.000Z'),
      shop: { shopName: 'Seller Shop' },
      offers: [],
      reminders: [],
      _count: { reminders: 0 },
    });

    expect(response).toMatchObject({
      id: 'live-1',
      playbackUrl: 'https://customer.example.cloudflarestream.com/input/iframe',
      streamProvider: 'CLOUDFLARE_STREAM',
      providerStatus: 'CONNECTED',
      actualStartedAt: new Date('2026-07-25T02:01:00.000Z'),
      actualEndedAt: null,
    });
    expect(response).not.toHaveProperty('streamProviderSessionId');
    expect(response).not.toHaveProperty('streamIngestUrl');
  });
});
