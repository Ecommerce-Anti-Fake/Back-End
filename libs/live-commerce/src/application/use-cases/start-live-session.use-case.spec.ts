import { BadRequestException } from '@nestjs/common';
import { StartLiveSessionUseCase } from './start-live-session.use-case';

describe('StartLiveSessionUseCase', () => {
  const repository = {
    findLiveSessionById: jest.fn(),
    findShopForLiveSession: jest.fn(),
    markLiveSessionStarting: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    repository.findLiveSessionById.mockResolvedValue({
      id: 'live-1',
      shopId: 'shop-1',
      title: 'Live hang chinh hang',
      status: 'SCHEDULED',
      streamProvider: 'CLOUDFLARE_STREAM',
      streamProviderSessionId: 'input-1',
      providerStatus: 'PROVISIONED',
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
    repository.markLiveSessionStarting.mockResolvedValue({
      id: 'live-1',
      shopId: 'shop-1',
      title: 'Live hang chinh hang',
      status: 'SCHEDULED',
      streamProvider: 'CLOUDFLARE_STREAM',
      providerStatus: 'STARTING',
      startAt: new Date('2026-07-25T02:00:00.000Z'),
      createdAt: new Date('2026-07-24T02:00:00.000Z'),
      shop: { shopName: 'Seller Shop' },
      offers: [],
      vouchers: [],
      reminders: [],
      _count: { reminders: 0 },
    });
  });

  it('marks a provisioned Cloudflare session as starting without making it live', async () => {
    const useCase = new StartLiveSessionUseCase(repository as never);

    const result = await useCase.execute({
      sessionId: 'live-1',
      requesterUserId: 'seller-1',
    });

    expect(repository.markLiveSessionStarting).toHaveBeenCalledWith({
      sessionId: 'live-1',
      requesterUserId: 'seller-1',
    });
    expect(result).toMatchObject({
      status: 'SCHEDULED',
      providerStatus: 'STARTING',
      actualStartedAt: null,
    });
  });

  it('rejects starting a terminal session', async () => {
    repository.findLiveSessionById.mockResolvedValueOnce({
      id: 'live-1',
      shopId: 'shop-1',
      status: 'ENDED',
      streamProvider: 'CLOUDFLARE_STREAM',
      streamProviderSessionId: 'input-1',
    });
    const useCase = new StartLiveSessionUseCase(repository as never);

    await expect(
      useCase.execute({
        sessionId: 'live-1',
        requesterUserId: 'seller-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.markLiveSessionStarting).not.toHaveBeenCalled();
  });
});
