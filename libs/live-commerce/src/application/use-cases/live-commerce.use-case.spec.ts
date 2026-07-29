import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CreateLiveSessionUseCase } from './create-live-session.use-case';
import { ListLiveSessionsUseCase } from './list-live-sessions.use-case';
import { RemindLiveSessionUseCase } from './remind-live-session.use-case';
import { UpdateLiveSessionOffersUseCase } from './update-live-session-offers.use-case';
import { UpdatePinnedLiveOfferUseCase } from './update-pinned-live-offer.use-case';
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
    updatePinnedOfferAtomic: jest.fn(),
    replaceLiveSessionOffersAtomic: jest.fn(),
  };
  const mediaService = {
    uploadCloudinaryBuffer: jest.fn(),
    deleteCloudinaryAsset: jest.fn(),
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
    repository.updatePinnedOfferAtomic.mockResolvedValue({
      kind: 'OK',
      changed: true,
      session: liveSession({
        pinnedOfferId: 'offer-1',
        pinnedOffer: liveOffer(),
      }),
    });
    repository.replaceLiveSessionOffersAtomic.mockResolvedValue({
      kind: 'OK',
      changed: true,
      session: liveSession(),
    });
    mediaService.uploadCloudinaryBuffer.mockResolvedValue({
      publicId: 'live/session-covers/seller-user-1-1',
      secureUrl: 'https://res.cloudinary.com/demo/image/upload/live-cover.png',
    });
  });

  it('creates a scheduled live session with active in-stock shop offers', async () => {
    const useCase = new CreateLiveSessionUseCase(
      repository as never,
      mediaService as never,
    );

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
    const useCase = new CreateLiveSessionUseCase(
      repository as never,
      mediaService as never,
    );
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
    const useCase = new CreateLiveSessionUseCase(
      repository as never,
      mediaService as never,
    );
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
    const useCase = new CreateLiveSessionUseCase(
      repository as never,
      mediaService as never,
    );

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

  it('uploads a validated cover after domain validation and stores only the secure URL', async () => {
    const useCase = new CreateLiveSessionUseCase(
      repository as never,
      mediaService as never,
    );
    const coverImage = pngFile();

    await useCase.execute({
      sessionId: 'live-1',
      requesterUserId: 'seller-user-1',
      shopId: 'shop-1',
      title: 'Live hang chinh hang',
      startAt: '2026-06-02T13:00:00.000Z',
      coverImage,
    });

    expect(mediaService.uploadCloudinaryBuffer).toHaveBeenCalledWith({
      buffer: coverImage.buffer,
      folder: 'live/session-covers',
      requesterUserId: 'seller-user-1',
      assetType: 'IMAGE',
      mimeType: 'image/png',
    });
    expect(repository.createLiveSession).toHaveBeenCalledWith(
      expect.objectContaining({
        coverUrl: 'https://res.cloudinary.com/demo/image/upload/live-cover.png',
      }),
    );
  });

  it('rejects a cover whose bytes do not match its declared image type', async () => {
    const useCase = new CreateLiveSessionUseCase(
      repository as never,
      mediaService as never,
    );

    await expect(
      useCase.execute({
        sessionId: 'live-1',
        requesterUserId: 'seller-user-1',
        shopId: 'shop-1',
        title: 'Live hang chinh hang',
        startAt: '2026-06-02T13:00:00.000Z',
        coverImage: {
          buffer: Buffer.from('not-a-png'),
          mimetype: 'image/png',
          originalname: 'cover.png',
          size: 9,
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mediaService.uploadCloudinaryBuffer).not.toHaveBeenCalled();
    expect(repository.createLiveSession).not.toHaveBeenCalled();
  });

  it('deletes an uploaded cover when session persistence fails', async () => {
    const useCase = new CreateLiveSessionUseCase(
      repository as never,
      mediaService as never,
    );
    repository.createLiveSession.mockRejectedValueOnce(
      new Error('database unavailable'),
    );

    await expect(
      useCase.execute({
        sessionId: 'live-1',
        requesterUserId: 'seller-user-1',
        shopId: 'shop-1',
        title: 'Live hang chinh hang',
        startAt: '2026-06-02T13:00:00.000Z',
        coverImage: pngFile(),
      }),
    ).rejects.toThrow('database unavailable');
    expect(mediaService.deleteCloudinaryAsset).toHaveBeenCalledWith({
      publicId: 'live/session-covers/seller-user-1-1',
      assetType: 'IMAGE',
    });
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

  it('allows an owner to request the all-status shop management list', async () => {
    const useCase = new ListLiveSessionsUseCase(repository as never);

    await useCase.execute({
      requesterUserId: 'seller-user-1',
      requesterRole: 'seller',
      filter: 'all',
      shopId: 'shop-1',
    });

    expect(repository.listLiveSessions).toHaveBeenCalledWith(
      expect.objectContaining({ includeTerminal: true }),
    );
  });

  it('rejects another user requesting the all-status shop management list', async () => {
    const useCase = new ListLiveSessionsUseCase(repository as never);

    await expect(
      useCase.execute({
        requesterUserId: 'other-user',
        requesterRole: 'seller',
        filter: 'all',
        shopId: 'shop-1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('pins an attached active in-stock offer and reports whether it changed', async () => {
    const useCase = new UpdatePinnedLiveOfferUseCase(repository as never);

    const result = await useCase.execute({
      sessionId: 'live-1',
      requesterUserId: 'seller-user-1',
      requesterRole: 'seller',
      offerId: 'offer-1',
    });

    expect(repository.updatePinnedOfferAtomic).toHaveBeenCalledWith({
      sessionId: 'live-1',
      offerId: 'offer-1',
      requesterUserId: 'seller-user-1',
    });
    expect(result).toMatchObject({
      changed: true,
      session: {
        pinnedOfferId: 'offer-1',
        pinnedOffer: { id: 'offer-1' },
      },
    });
  });

  it('rejects replacing offers when the pinned offer would be removed', async () => {
    const useCase = new UpdateLiveSessionOffersUseCase(repository as never);
    repository.findLiveSessionById.mockResolvedValueOnce(
      liveSession({ pinnedOfferId: 'offer-1', pinnedOffer: liveOffer() }),
    );

    await expect(
      useCase.execute({
        sessionId: 'live-1',
        requesterUserId: 'seller-user-1',
        requesterRole: 'seller',
        offerIds: [],
      }),
    ).rejects.toThrow('Unpin or switch the pinned offer before removing it');
    expect(repository.replaceLiveSessionOffersAtomic).not.toHaveBeenCalled();
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
    pinnedOfferId: null,
    pinnedOffer: null,
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

function liveOffer() {
  return {
    id: 'offer-1',
    title: 'San pham 1',
    currency: 'VND',
    offerStatus: 'active',
    variants: [{ price: 100000, availableQuantity: 10 }],
    media: [],
  };
}

function pngFile() {
  const buffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
  ]);
  return {
    buffer,
    mimetype: 'image/png',
    originalname: 'cover.png',
    size: buffer.length,
  };
}
