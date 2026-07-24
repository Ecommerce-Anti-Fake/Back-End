import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GetLiveAnalyticsUseCase } from './get-live-analytics.use-case';

describe('GetLiveAnalyticsUseCase', () => {
  const repository = {
    findLiveSessionById: jest.fn(),
    getLiveSessionAnalytics: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repository.findLiveSessionById.mockResolvedValue({
      id: 'live-1',
      shop: { ownerUserId: 'seller-1' },
    });
    repository.getLiveSessionAnalytics.mockResolvedValue({
      reminderCount: 10,
      commentCount: 22,
      conversionCount: 3,
      unitsSold: 5,
      grossRevenue: 750000,
    });
  });

  it('returns durable commerce metrics to the session shop owner', async () => {
    const useCase = new GetLiveAnalyticsUseCase(repository as never);

    const result = await useCase.execute({
      sessionId: 'live-1',
      requesterUserId: 'seller-1',
      requesterRole: 'seller',
    });

    expect(result).toEqual(
      expect.objectContaining({
        liveSessionId: 'live-1',
        conversionCount: 3,
        grossRevenue: 750000,
      }),
    );
  });

  it('allows admin but blocks unrelated users', async () => {
    const useCase = new GetLiveAnalyticsUseCase(repository as never);

    await expect(
      useCase.execute({
        sessionId: 'live-1',
        requesterUserId: 'admin-1',
        requesterRole: 'admin',
      }),
    ).resolves.toBeDefined();
    await expect(
      useCase.execute({
        sessionId: 'live-1',
        requesterUserId: 'buyer-1',
        requesterRole: 'user',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects an unknown live session', async () => {
    repository.findLiveSessionById.mockResolvedValue(null);
    const useCase = new GetLiveAnalyticsUseCase(repository as never);

    await expect(
      useCase.execute({
        sessionId: 'missing',
        requesterUserId: 'seller-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
