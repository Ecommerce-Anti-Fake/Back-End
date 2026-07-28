import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { StartLiveSessionUseCase } from './start-live-session.use-case';

describe('StartLiveSessionUseCase', () => {
  const repository = {
    findLiveSessionById: jest.fn(),
    findShopForLiveSession: jest.fn(),
    markLiveSessionLive: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    repository.findLiveSessionById.mockResolvedValue({
      id: 'live-1',
      shopId: 'shop-1',
      title: 'Live hang chinh hang',
      status: 'SCHEDULED',
      streamProvider: 'AGORA_RTC',
      streamProviderSessionId: 'live_live1',
      providerStatus: 'READY',
      startAt: new Date('2026-07-25T02:00:00.000Z'),
      createdAt: new Date('2026-07-24T02:00:00.000Z'),
      shop: { shopName: 'Seller Shop' },
      offers: [],
      vouchers: [],
      reminders: [],
      _count: { reminders: 0 },
    });
    repository.findShopForLiveSession.mockResolvedValue({
      id: 'shop-1',
      ownerUserId: 'seller-1',
    });
    repository.markLiveSessionLive.mockResolvedValue({
      startedNow: true,
      reminderUserIds: ['buyer-1', 'buyer-2'],
      session: {
        id: 'live-1',
        shopId: 'shop-1',
        title: 'Live hang chinh hang',
        status: 'LIVE',
        streamProvider: 'AGORA_RTC',
        providerStatus: 'CONNECTED',
        actualStartedAt: new Date('2026-07-25T02:00:00.000Z'),
        startAt: new Date('2026-07-25T02:00:00.000Z'),
        createdAt: new Date('2026-07-24T02:00:00.000Z'),
        shop: { shopName: 'Seller Shop' },
        offers: [],
        vouchers: [],
        reminders: [],
        _count: { reminders: 0 },
      },
    });
  });

  it('marks an Agora session live only after the host published', async () => {
    const useCase = new StartLiveSessionUseCase(repository as never);

    const result = await useCase.execute({
      sessionId: 'live-1',
      requesterUserId: 'seller-1',
    });

    expect(repository.markLiveSessionLive).toHaveBeenCalledWith({
      sessionId: 'live-1',
      requesterUserId: 'seller-1',
      startedAt: expect.any(Date) as Date,
    });
    expect(result).toMatchObject({
      status: 'LIVE',
      providerStatus: 'CONNECTED',
      actualStartedAt: expect.any(Date) as Date,
      reminderUserIds: ['buyer-1', 'buyer-2'],
      startedNow: true,
    });
  });

  it('rejects starting a terminal session', async () => {
    repository.findLiveSessionById.mockResolvedValueOnce({
      id: 'live-1',
      shopId: 'shop-1',
      status: 'ENDED',
      streamProvider: 'AGORA_RTC',
      streamProviderSessionId: 'live_live1',
    });
    const useCase = new StartLiveSessionUseCase(repository as never);

    await expect(
      useCase.execute({
        sessionId: 'live-1',
        requesterUserId: 'seller-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.markLiveSessionLive).not.toHaveBeenCalled();
  });

  it('returns reminder recipients when an idempotent start retries side effects', async () => {
    repository.findLiveSessionById.mockResolvedValueOnce({
      id: 'live-1',
      shopId: 'shop-1',
      status: 'LIVE',
      streamProvider: 'AGORA_RTC',
      streamProviderSessionId: 'live_live1',
      startAt: new Date('2026-07-25T02:00:00.000Z'),
      createdAt: new Date('2026-07-24T02:00:00.000Z'),
      shop: { shopName: 'Seller Shop' },
      offers: [],
      vouchers: [],
      reminders: [],
      _count: { reminders: 0 },
    });
    const useCase = new StartLiveSessionUseCase(repository as never);
    repository.markLiveSessionLive.mockResolvedValueOnce({
      startedNow: false,
      reminderUserIds: ['buyer-1', 'buyer-2'],
      session: {
        id: 'live-1',
        shopId: 'shop-1',
        status: 'LIVE',
        streamProvider: 'AGORA_RTC',
        streamProviderSessionId: 'live_live1',
        startAt: new Date('2026-07-25T02:00:00.000Z'),
        createdAt: new Date('2026-07-24T02:00:00.000Z'),
        shop: { shopName: 'Seller Shop' },
        offers: [],
        vouchers: [],
        reminders: [],
        _count: { reminders: 0 },
      },
    });

    await expect(
      useCase.execute({
        sessionId: 'live-1',
        requesterUserId: 'seller-1',
      }),
    ).resolves.toMatchObject({
      status: 'LIVE',
      startedNow: false,
      reminderUserIds: ['buyer-1', 'buyer-2'],
    });
    expect(repository.markLiveSessionLive).toHaveBeenCalledTimes(1);
  });

  it('does not allow an admin who is not the shop owner to start publishing', async () => {
    const useCase = new StartLiveSessionUseCase(repository as never);

    await expect(
      useCase.execute({
        sessionId: 'live-1',
        requesterUserId: 'admin-1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.markLiveSessionLive).not.toHaveBeenCalled();
  });
});
