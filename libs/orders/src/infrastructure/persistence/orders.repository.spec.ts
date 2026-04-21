import { OrdersRepository } from './orders.repository';

describe('OrdersRepository', () => {
  it('should lock offer inventory rows before decrementing stock', async () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      offer: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    const prisma = {};

    const repository = new OrdersRepository(prisma as never);

    await repository.lockOfferInventoryRows(tx as never, 'offer-1');
    await repository.decrementOfferAvailableQuantity(tx as never, 'offer-1', 1);

    expect(tx.$queryRaw).toHaveBeenCalledTimes(3);
    expect(tx.offer.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.offer.updateMany.mock.invocationCallOrder[0]);
    expect(tx.$queryRaw.mock.invocationCallOrder[1]).toBeLessThan(tx.offer.updateMany.mock.invocationCallOrder[0]);
    expect(tx.$queryRaw.mock.invocationCallOrder[2]).toBeLessThan(tx.offer.updateMany.mock.invocationCallOrder[0]);
  });
});
