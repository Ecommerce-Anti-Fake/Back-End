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
      streamProvider: 'CLOUDFLARE_STREAM',
      streamProviderSessionId: 'input-1',
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
        requesterRole: 'user',
      }),
    ).resolves.toEqual({
      sessionId: 'live-1',
      shopId: 'shop-1',
      status: 'SCHEDULED',
      streamProvider: 'CLOUDFLARE_STREAM',
      providerSessionId: 'input-1',
    });
  });

  it('rejects users who do not own the live shop', async () => {
    const useCase = new GetLiveBroadcastContextUseCase(repository as never);

    await expect(
      useCase.execute({
        sessionId: 'live-1',
        requesterUserId: 'other-user',
        requesterRole: 'user',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
