import { ForbiddenException } from '@nestjs/common';
import { GetLiveBroadcastContextUseCase } from './get-live-broadcast-context.use-case';

describe('GetLiveBroadcastContextUseCase', () => {
  const repository = {
    findLiveSessionById: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    repository.findLiveSessionById.mockResolvedValue({
      id: 'live-1',
      shopId: 'shop-1',
      status: 'SCHEDULED',
      streamProvider: 'AGORA_RTC',
      streamProviderSessionId: 'live_live1',
      shop: {
        shopName: 'Seller Shop',
        ownerUserId: 'seller-1',
      },
    });
  });

  it('returns private provider context to the shop owner', async () => {
    const useCase = new GetLiveBroadcastContextUseCase(repository as never);

    await expect(
      useCase.execute({
        sessionId: 'live-1',
        requesterUserId: 'seller-1',
      }),
    ).resolves.toEqual({
      sessionId: 'live-1',
      shopId: 'shop-1',
      status: 'SCHEDULED',
      streamProvider: 'AGORA_RTC',
      providerSessionId: 'live_live1',
      rtcRole: 'PUBLISHER',
    });
  });

  it('rejects users who do not own the live shop', async () => {
    const useCase = new GetLiveBroadcastContextUseCase(repository as never);

    await expect(
      useCase.execute({
        sessionId: 'live-1',
        requesterUserId: 'other-user',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns Agora context to an audience member only while the session is live', async () => {
    repository.findLiveSessionById.mockResolvedValueOnce({
      id: 'live-1',
      shopId: 'shop-1',
      status: 'LIVE',
      streamProvider: 'AGORA_RTC',
      streamProviderSessionId: 'live_live1',
      shop: {
        shopName: 'Seller Shop',
        ownerUserId: 'seller-1',
      },
    });
    const useCase = new GetLiveBroadcastContextUseCase(repository as never);

    await expect(
      useCase.execute({
        sessionId: 'live-1',
        requesterUserId: null,
        accessRole: 'auto',
      }),
    ).resolves.toEqual({
      sessionId: 'live-1',
      shopId: 'shop-1',
      status: 'LIVE',
      streamProvider: 'AGORA_RTC',
      providerSessionId: 'live_live1',
      rtcRole: 'SUBSCRIBER',
    });
  });

  it('does not grant publisher access to an admin who is not the shop owner', async () => {
    repository.findLiveSessionById.mockResolvedValueOnce({
      id: 'live-1',
      shopId: 'shop-1',
      status: 'LIVE',
      streamProvider: 'AGORA_RTC',
      streamProviderSessionId: 'live_live1',
      shop: {
        shopName: 'Seller Shop',
        ownerUserId: 'seller-1',
      },
    });
    const useCase = new GetLiveBroadcastContextUseCase(repository as never);

    await expect(
      useCase.execute({
        sessionId: 'live-1',
        requesterUserId: 'admin-1',
        accessRole: 'auto',
      }),
    ).resolves.toMatchObject({ rtcRole: 'SUBSCRIBER' });
  });

  it('returns a nullable provider ID for unmanaged sessions', async () => {
    repository.findLiveSessionById.mockResolvedValueOnce({
      id: 'live-1',
      shopId: 'shop-1',
      status: 'SCHEDULED',
      streamProvider: 'HLS_CDN',
      streamProviderSessionId: null,
      shop: {
        shopName: 'Seller Shop',
        ownerUserId: 'seller-1',
      },
    });
    const useCase = new GetLiveBroadcastContextUseCase(repository as never);

    await expect(
      useCase.execute({
        sessionId: 'live-1',
        requesterUserId: 'seller-1',
      }),
    ).resolves.toEqual({
      sessionId: 'live-1',
      shopId: 'shop-1',
      status: 'SCHEDULED',
      streamProvider: 'HLS_CDN',
      providerSessionId: null,
      rtcRole: 'PUBLISHER',
    });
  });
});
