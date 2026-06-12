import { ShopsRepository } from './shops.repository';

describe('ShopsRepository', () => {
  it('returns paginated public shop summaries with review and sale metrics', async () => {
    const prisma = {
      shop: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'shop-1',
            shopName: 'Shop ABC',
            shopStatus: 'active',
          },
        ]),
      },
      review: {
        aggregate: jest.fn().mockResolvedValue({
          _avg: { rating: 4.5 },
          _count: { _all: 2 },
        }),
      },
      orderItem: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { quantity: 15 },
        }),
      },
      $transaction: jest.fn((queries) => Promise.all(queries)),
    };
    const repository = new ShopsRepository(prisma as never);

    await expect(repository.findPublicShopSummaries({ page: 2, pageSize: 10 })).resolves.toEqual({
      total: 1,
      page: 2,
      pageSize: 10,
      items: [
        {
          id: 'shop-1',
          name: 'Shop ABC',
          avatarUrl: '',
          isVerified: true,
          rating: 4.5,
          totalReviews: 2,
          totalSale: 15,
        },
      ],
    });

    expect(prisma.shop.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { shopStatus: 'active' },
        skip: 10,
        take: 10,
      }),
    );
  });

  it('returns a public shop summary by offer id', async () => {
    const prisma = {
      offer: {
        findUnique: jest.fn().mockResolvedValue({
          shop: {
            id: 'shop-1',
            shopName: 'Shop ABC',
            shopStatus: 'active',
          },
        }),
      },
      review: {
        aggregate: jest.fn().mockResolvedValue({
          _avg: { rating: 5 },
          _count: { _all: 1 },
        }),
      },
      orderItem: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { quantity: 3 },
        }),
      },
    };
    const repository = new ShopsRepository(prisma as never);

    await expect(repository.findPublicShopSummaryByOfferId('offer-1')).resolves.toEqual({
      id: 'shop-1',
      name: 'Shop ABC',
      avatarUrl: '',
      isVerified: true,
      rating: 5,
      totalReviews: 1,
      totalSale: 3,
    });

    expect(prisma.offer.findUnique).toHaveBeenCalledWith({
      where: { id: 'offer-1' },
      select: expect.objectContaining({
        shop: expect.any(Object),
      }),
    });
  });
});
