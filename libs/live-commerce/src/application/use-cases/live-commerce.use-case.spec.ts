import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CreateLiveSessionUseCase } from './create-live-session.use-case';
import { ListLiveSessionsUseCase } from './list-live-sessions.use-case';
import { RemindLiveSessionUseCase } from './remind-live-session.use-case';
import { UpdateLiveSessionStatusUseCase } from './update-live-session-status.use-case';

describe('live-commerce use cases in LiveCommerceModule', () => {
  const repository = {
    findShopForLiveSession: jest.fn(),
    findOffersForLiveSession: jest.fn(),
    createLiveSession: jest.fn(),
    listLiveSessions: jest.fn(),
    findLiveSessionById: jest.fn(),
    updateLiveSessionStatus: jest.fn(),
    remindLiveSession: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    repository.findShopForLiveSession.mockResolvedValue({
      id: 'shop-1',
      ownerUserId: 'seller-user-1',
      shopName: 'Seller Shop',
      shopStatus: 'verified',
    });
    repository.findOffersForLiveSession.mockResolvedValue([
      {
        id: 'offer-1',
        shopId: 'shop-1',
        offerStatus: 'active',
        availableQuantity: 10,
      },
    ]);
    repository.createLiveSession.mockResolvedValue(liveSession());
    repository.listLiveSessions.mockResolvedValue([liveSession()]);
    repository.findLiveSessionById.mockResolvedValue(liveSession());
    repository.updateLiveSessionStatus.mockResolvedValue(
      liveSession({ status: 'LIVE' }),
    );
    repository.remindLiveSession.mockResolvedValue(
      liveSession({ reminders: [{ userId: 'buyer-user-1' }] }),
    );
  });

  it('creates a scheduled live session with active in-stock shop offers', async () => {
    const useCase = new CreateLiveSessionUseCase(repository as never);

    const result = await useCase.execute({
      requesterUserId: 'seller-user-1',
      shopId: 'shop-1',
      title: 'Live hang chinh hang',
      description: 'San pham co QR',
      startAt: '2026-06-02T13:00:00.000Z',
      playbackUrl: 'https://video.example.com/live-1',
      streamProvider: 'HLS_CDN',
      streamProviderSessionId: 'provider-live-1',
      streamIngestUrl: 'rtmp://ingest.example.com/live/live-1',
      streamLatencyTargetMs: 8000,
      recordingUrl: 'https://cdn.example.com/recordings/live-1.m3u8',
      recordingRetentionDays: 30,
      offerIds: ['offer-1'],
    });

    expect(repository.createLiveSession).toHaveBeenCalledWith(
      expect.objectContaining({
        shopId: 'shop-1',
        title: 'Live hang chinh hang',
        offerIds: ['offer-1'],
        requesterUserId: 'seller-user-1',
        streamProvider: 'HLS_CDN',
        streamProviderSessionId: 'provider-live-1',
        streamLatencyTargetMs: 8000,
        recordingRetentionDays: 30,
      }),
    );
    expect(result).toMatchObject({
      id: 'live-1',
      status: 'SCHEDULED',
      streamProvider: 'HLS_CDN',
      streamProviderSessionId: 'provider-live-1',
      offers: [expect.objectContaining({ offerId: 'offer-1' })],
    });
  });

  it('rejects live offers that do not belong to the seller shop or have no stock', async () => {
    const useCase = new CreateLiveSessionUseCase(repository as never);
    repository.findOffersForLiveSession.mockResolvedValueOnce([
      {
        id: 'offer-1',
        shopId: 'other-shop',
        offerStatus: 'active',
        availableQuantity: 10,
      },
    ]);

    await expect(
      useCase.execute({
        requesterUserId: 'seller-user-1',
        shopId: 'shop-1',
        title: 'Live hang chinh hang',
        startAt: '2026-06-02T13:00:00.000Z',
        offerIds: ['offer-1'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects non-owner live session creation', async () => {
    const useCase = new CreateLiveSessionUseCase(repository as never);

    await expect(
      useCase.execute({
        requesterUserId: 'other-user',
        shopId: 'shop-1',
        title: 'Live hang chinh hang',
        startAt: '2026-06-02T13:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows scheduled sessions to move live', async () => {
    const useCase = new UpdateLiveSessionStatusUseCase(repository as never);

    const result = await useCase.execute({
      sessionId: 'live-1',
      requesterUserId: 'seller-user-1',
      status: 'LIVE',
    });

    expect(repository.updateLiveSessionStatus).toHaveBeenCalledWith({
      sessionId: 'live-1',
      requesterUserId: 'seller-user-1',
      status: 'LIVE',
    });
    expect(result.status).toBe('LIVE');
  });

  it('lists live sessions with filter and search input', async () => {
    const useCase = new ListLiveSessionsUseCase(repository as never);

    const result = await useCase.execute({
      requesterUserId: 'buyer-user-1',
      filter: 'upcoming',
      q: 'QR',
    });

    expect(repository.listLiveSessions).toHaveBeenCalledWith({
      requesterUserId: 'buyer-user-1',
      filter: 'upcoming',
      q: 'QR',
    });
    expect(result).toHaveLength(1);
  });

  it('rejects invalid status transitions', async () => {
    const useCase = new UpdateLiveSessionStatusUseCase(repository as never);
    repository.findLiveSessionById.mockResolvedValueOnce(
      liveSession({ status: 'ENDED' }),
    );

    await expect(
      useCase.execute({
        sessionId: 'live-1',
        requesterUserId: 'seller-user-1',
        status: 'LIVE',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates reminders idempotently for scheduled sessions', async () => {
    const useCase = new RemindLiveSessionUseCase(repository as never);

    const result = await useCase.execute({
      sessionId: 'live-1',
      requesterUserId: 'buyer-user-1',
    });

    expect(repository.remindLiveSession).toHaveBeenCalledWith({
      sessionId: 'live-1',
      userId: 'buyer-user-1',
    });
    expect(result.viewerHasReminder).toBe(true);
  });
});

function liveSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'live-1',
    shopId: 'shop-1',
    title: 'Live hang chinh hang',
    description: 'San pham co QR',
    coverUrl: null,
    startAt: new Date('2026-06-02T13:00:00.000Z'),
    status: 'SCHEDULED',
    playbackUrl: 'https://video.example.com/live-1',
    streamProvider: 'HLS_CDN',
    streamProviderSessionId: 'provider-live-1',
    streamIngestUrl: 'rtmp://ingest.example.com/live/live-1',
    streamLatencyTargetMs: 8000,
    recordingUrl: 'https://cdn.example.com/recordings/live-1.m3u8',
    recordingRetentionDays: 30,
    createdAt: new Date('2026-06-01T10:00:00.000Z'),
    shop: { shopName: 'Seller Shop' },
    offers: [
      {
        offer: {
          id: 'offer-1',
          title: 'San pham 1',
          price: 100000,
          currency: 'VND',
          availableQuantity: 10,
          media: [],
        },
      },
    ],
    reminders: [],
    _count: { reminders: 0 },
    ...overrides,
  };
}
