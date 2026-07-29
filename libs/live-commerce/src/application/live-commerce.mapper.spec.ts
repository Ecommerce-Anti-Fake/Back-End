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
      playbackUrl: null,
      streamProvider: 'AGORA_RTC',
      streamProviderSessionId: 'live_live1',
      streamIngestUrl: null,
      streamLatencyTargetMs: 1000,
      providerStatus: 'CONNECTED',
      actualStartedAt: new Date('2026-07-25T02:01:00.000Z'),
      actualEndedAt: null,
      recordingUrl: null,
      recordingRetentionDays: null,
      createdAt: new Date('2026-07-24T02:00:00.000Z'),
      shop: { shopName: 'Seller Shop' },
      offers: [],
      reminders: [],
      _count: { reminders: 0 },
    });

    expect(response).toMatchObject({
      id: 'live-1',
      playbackUrl: null,
      streamProvider: 'AGORA_RTC',
      providerStatus: 'CONNECTED',
      actualStartedAt: new Date('2026-07-25T02:01:00.000Z'),
      actualEndedAt: null,
    });
    expect(response).not.toHaveProperty('streamProviderSessionId');
    expect(response).not.toHaveProperty('streamIngestUrl');
  });

  it('keeps terminal detail accessible without exposing replay URLs', () => {
    const response = toLiveSessionResponse({
      ...liveSession(),
      status: 'ENDED',
      playbackUrl: 'https://legacy.example/live.m3u8',
      recordingUrl: 'https://legacy.example/replay.mp4',
      recordingRetentionDays: 30,
    });

    expect(response.playbackUrl).toBeNull();
    expect(response.recordingUrl).toBeNull();
    expect(response.recordingRetentionDays).toBeNull();
  });

  it('maps the pinned offer and exposes sold-out state without unpinning it', () => {
    const response = toLiveSessionResponse({
      id: 'live-1',
      shopId: 'shop-1',
      title: 'Live hang chinh hang',
      description: null,
      coverUrl: null,
      pinnedOfferId: 'offer-1',
      startAt: new Date('2026-07-25T02:00:00.000Z'),
      status: 'LIVE',
      playbackUrl: null,
      createdAt: new Date('2026-07-24T02:00:00.000Z'),
      shop: { shopName: 'Seller Shop' },
      pinnedOffer: {
        id: 'offer-1',
        title: 'San pham dang ghim',
        currency: 'VND',
        offerStatus: 'active',
        variants: [{ price: 125000, availableQuantity: 0 }],
        media: [],
      },
      offers: [],
      reminders: [],
      _count: { reminders: 0 },
    });

    expect(response).toMatchObject({
      pinnedOfferId: 'offer-1',
      pinnedOffer: {
        id: 'offer-1',
        title: 'San pham dang ghim',
        price: 125000,
        currency: 'VND',
        thumbnailUrl: null,
        availableQuantity: 0,
      },
    });
  });
});

function liveSession() {
  return {
    id: 'live-1',
    shopId: 'shop-1',
    title: 'Live hang chinh hang',
    description: null,
    coverUrl: null,
    startAt: new Date('2026-07-25T02:00:00.000Z'),
    status: 'SCHEDULED',
    playbackUrl: null,
    createdAt: new Date('2026-07-24T02:00:00.000Z'),
    shop: { shopName: 'Seller Shop' },
    offers: [],
    reminders: [],
    _count: { reminders: 0 },
  };
}
