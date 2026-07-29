import { LiveCommerceRepository } from './live-commerce.repository';

describe('LiveCommerceRepository.listLiveSessions', () => {
  it('returns live sessions before future scheduled sessions for public all', async () => {
    const inputs: unknown[] = [];
    const results = [
      [{ id: 'live-now', status: 'LIVE' }],
      [{ id: 'live-later', status: 'SCHEDULED' }],
    ];
    const findMany = jest.fn((input: unknown) => {
      inputs.push(input);
      return Promise.resolve(results[inputs.length - 1] ?? []);
    });
    const repository = new LiveCommerceRepository({
      liveCommerceSession: { findMany },
    } as never);

    await expect(
      repository.listLiveSessions({ filter: 'all' }),
    ).resolves.toEqual([
      { id: 'live-now', status: 'LIVE' },
      { id: 'live-later', status: 'SCHEDULED' },
    ]);
    const firstInput = inputs[0] as {
      where: { status: string };
    };
    const secondInput = inputs[1] as {
      where: { status: string; startAt: { gte: Date } };
      orderBy: { startAt: string };
    };
    expect(firstInput.where.status).toBe('LIVE');
    expect(secondInput.where.status).toBe('SCHEDULED');
    expect(secondInput.where.startAt.gte).toBeInstanceOf(Date);
    expect(secondInput.orderBy).toEqual({ startAt: 'asc' });
  });

  it('uses one unrestricted status query for an authorized shop management list', async () => {
    const findMany = jest
      .fn()
      .mockResolvedValue([{ id: 'cancelled', status: 'CANCELLED' }]);
    const repository = new LiveCommerceRepository({
      liveCommerceSession: { findMany },
    } as never);

    await repository.listLiveSessions({
      requesterUserId: 'seller-1',
      filter: 'all',
      shopId: 'shop-1',
      includeTerminal: true,
    });

    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { shopId: 'shop-1' },
        orderBy: { createdAt: 'desc' },
      }),
    );
  });
});
