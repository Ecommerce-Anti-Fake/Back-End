import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CreateLiveSessionUseCase } from './create-live-session.use-case';
import { ListLiveSessionsUseCase } from './list-live-sessions.use-case';
import { RemindLiveSessionUseCase } from './remind-live-session.use-case';
import { UpdateLiveSessionStatusUseCase } from './update-live-session-status.use-case';

describe('live-commerce use cases in LiveCommerceModule', () => {
  const repository = {
    findShopForLiveSession: jest.fn(),
    findOffersForLiveSession: jest.fn(),
    findVouchersForLiveSession: jest.fn(),
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
        variants: [{ availableQuantity: 10 }],
      },
    ]);
    repository.findVouchersForLiveSession.mockResolvedValue([
      {
        id: 'voucher-1',
        ownerType: 'SHOP',
        shopId: 'shop-1',
        status: 'ACTIVE',
        startsAt: new Date('2026-06-01T00:00:00.000Z'),
        endsAt: new Date('2026-06-03T00:00:00.000Z'),
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
      sessionId: 'live-1',
      requesterUserId: 'seller-user-1',
      shopId: 'shop-1',
      title: 'Live hang chinh hang',
      description: 'San pham co QR',
      startAt: '2026-06-02T13:00:00.000Z',
      offerIds: ['offer-1'],
      voucherIds: ['voucher-1'],
    });

    expect(repository.createLiveSession).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'live-1',
        shopId: 'shop-1',
        title: 'Live hang chinh hang',
        offerIds: ['offer-1'],
        voucherIds: ['voucher-1'],
        requesterUserId: 'seller-user-1',
        playbackUrl: null,
        streamProvider: 'AGORA_RTC',
        streamProviderSessionId: 'live_live1',
        streamIngestUrl: null,
        streamLatencyTargetMs: 1000,
        providerStatus: 'READY',
        recordingUrl: null,
        recordingRetentionDays: null,
      }),
    );
    expect(result).toMatchObject({
      id: 'live-1',
      status: 'SCHEDULED',
      streamProvider: 'AGORA_RTC',
      offers: [expect.objectContaining({ offerId: 'offer-1' })],
    });
    expect(result).not.toHaveProperty('streamProviderSessionId');
    expect(result).not.toHaveProperty('streamIngestUrl');
  });

  it('rejects vouchers that are not active shop vouchers at live time', async () => {
    const useCase = new CreateLiveSessionUseCase(repository as never);
    repository.findVouchersForLiveSession.mockResolvedValueOnce([
      {
        id: 'voucher-1',
        ownerType: 'SHOP',
        shopId: 'other-shop',
        status: 'ACTIVE',
        startsAt: new Date('2026-06-01T00:00:00.000Z'),
        endsAt: new Date('2026-06-03T00:00:00.000Z'),
      },
    ]);

    await expect(
      useCase.execute({
        sessionId: 'live-1',
        requesterUserId: 'seller-user-1',
        shopId: 'shop-1',
        title: 'Live hang chinh hang',
        startAt: '2026-06-02T13:00:00.000Z',
        voucherIds: ['voucher-1'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects live offers that do not belong to the seller shop or have no stock', async () => {
    const useCase = new CreateLiveSessionUseCase(repository as never);
    repository.findOffersForLiveSession.mockResolvedValueOnce([
      {
        id: 'offer-1',
        shopId: 'other-shop',
        offerStatus: 'active',
        variants: [{ availableQuantity: 10 }],
      },
    ]);

    await expect(
      useCase.execute({
        sessionId: 'live-1',
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
        sessionId: 'live-1',
        requesterUserId: 'other-user',
        shopId: 'shop-1',
        title: 'Live hang chinh hang',
        startAt: '2026-06-02T13:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects seller attempts to mark a scheduled session live before the provider connects', async () => {
    const useCase = new UpdateLiveSessionStatusUseCase(repository as never);

    await expect(
      useCase.execute({
        sessionId: 'live-1',
        requesterUserId: 'seller-user-1',
        status: 'LIVE' as never,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.updateLiveSessionStatus).not.toHaveBeenCalled();
  });

  it('records the actual end time when a live session is ended', async () => {
    const useCase = new UpdateLiveSessionStatusUseCase(repository as never);
    repository.findLiveSessionById.mockResolvedValueOnce(
      liveSession({ status: 'LIVE' }),
    );
    repository.updateLiveSessionStatus.mockResolvedValueOnce(
      liveSession({
        status: 'ENDED',
        actualEndedAt: new Date('2026-06-02T14:00:00.000Z'),
      }),
    );

    await expect(
      useCase.execute({
        sessionId: 'live-1',
        requesterUserId: 'seller-user-1',
        status: 'ENDED',
      }),
    ).resolves.toMatchObject({
      status: 'ENDED',
      actualEndedAt: new Date('2026-06-02T14:00:00.000Z'),
    });
    expect(repository.updateLiveSessionStatus).toHaveBeenCalledWith({
      sessionId: 'live-1',
      requesterUserId: 'seller-user-1',
      status: 'ENDED',
      actualEndedAt: expect.any(Date) as Date,
    });
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
        status: 'LIVE' as never,
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

  it('rejects a reminder when the atomic repository check observes LIVE', async () => {
    repository.remindLiveSession.mockResolvedValueOnce(
      liveSession({ status: 'LIVE' }),
    );
    const useCase = new RemindLiveSessionUseCase(repository as never);

    await expect(
      useCase.execute({
        sessionId: 'live-1',
        requesterUserId: 'buyer-user-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
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
    playbackUrl: null,
    streamProvider: 'AGORA_RTC',
    streamProviderSessionId: 'live_live1',
    streamIngestUrl: null,
    streamLatencyTargetMs: 1000,
    providerStatus: 'READY',
    recordingUrl: null,
    recordingRetentionDays: null,
    createdAt: new Date('2026-06-01T10:00:00.000Z'),
    shop: { shopName: 'Seller Shop' },
    offers: [
      {
        offer: {
          id: 'offer-1',
          title: 'San pham 1',
          currency: 'VND',
          variants: [{ price: 100000, availableQuantity: 10 }],
          media: [],
        },
      },
    ],
    vouchers: [
      {
        voucher: {
          id: 'voucher-1',
          code: 'LIVE10',
          name: 'Giam 10%',
          discountType: 'PERCENTAGE',
          percentage: 10,
          fixedAmount: null,
          maxDiscountAmount: 50000,
          minOrderAmount: 100000,
          startsAt: new Date('2026-06-01T00:00:00.000Z'),
          endsAt: new Date('2026-06-03T00:00:00.000Z'),
          status: 'ACTIVE',
        },
      },
    ],
    reminders: [],
    _count: { reminders: 0 },
    ...overrides,
  };
}
