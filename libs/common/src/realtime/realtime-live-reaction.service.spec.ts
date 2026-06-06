import { RealtimeLiveReactionService } from './realtime-live-reaction.service';

describe('RealtimeLiveReactionService', () => {
  const configService = {
    getConfig: () => ({
      enabled: false,
      mode: 'disabled',
      url: null,
      keyPrefix: 'test',
      defaultTtlSeconds: 300,
      connectionName: 'test-realtime',
    }),
  };

  it('aggregates accepted live reactions without durable persistence', async () => {
    const service = new RealtimeLiveReactionService(configService as never);

    await expect(service.recordReaction({ liveSessionId: 'live-1', userId: 'user-1', reactionType: 'LIKE' })).resolves.toMatchObject({
      accepted: true,
      aggregate: { total: 1, totals: { LIKE: 1 } },
    });
    await service.recordReaction({ liveSessionId: 'live-1', userId: 'user-2', reactionType: 'FIRE' });

    await expect(service.getAggregate('live-1')).resolves.toEqual({
      liveSessionId: 'live-1',
      totals: { LIKE: 1, LOVE: 0, WOW: 0, FIRE: 1 },
      total: 2,
    });
  });

  it('drops reactions after the per-user live session rate limit', async () => {
    const service = new RealtimeLiveReactionService(configService as never);

    for (let index = 0; index < 12; index += 1) {
      await expect(service.recordReaction({ liveSessionId: 'live-1', userId: 'user-1', reactionType: 'LOVE' })).resolves.toMatchObject({
        accepted: true,
      });
    }

    await expect(service.recordReaction({ liveSessionId: 'live-1', userId: 'user-1', reactionType: 'LOVE' })).resolves.toMatchObject({
      accepted: false,
      reason: 'rate_limited',
      aggregate: { total: 12 },
    });
  });
});
