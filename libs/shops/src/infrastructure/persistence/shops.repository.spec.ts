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
            createdAt: new Date('2026-06-24T02:00:00.000Z'),
            avatarMedia: {
              secureUrl: 'https://cdn.test/shop-avatar.jpg',
            },
            bannerMedia: {
              secureUrl: 'https://cdn.test/shop-banner.jpg',
            },
            _count: {
              offers: 7,
            },
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
          shopId: 'shop-1',
          shopName: 'Shop ABC',
          shopAvatar: 'https://cdn.test/shop-avatar.jpg',
          shopBanner: 'https://cdn.test/shop-banner.jpg',
          rating: 4.5,
          totalOffer: 7,
          totalSale: 15,
          totalReview: 2,
          createdAt: '2026-06-24T02:00:00.000Z',
          verify: true,
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
          createdAt: new Date('2026-06-24T02:00:00.000Z'),
          avatarMedia: {
            secureUrl: 'https://cdn.test/shop-avatar.jpg',
          },
          bannerMedia: {
            secureUrl: 'https://cdn.test/shop-banner.jpg',
          },
          _count: {
            offers: 4,
          },
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
      shopId: 'shop-1',
      shopName: 'Shop ABC',
      shopAvatar: 'https://cdn.test/shop-avatar.jpg',
      shopBanner: 'https://cdn.test/shop-banner.jpg',
      rating: 5,
      totalOffer: 4,
      totalSale: 3,
      totalReview: 1,
      createdAt: '2026-06-24T02:00:00.000Z',
      verify: true,
    });

    expect(prisma.offer.findUnique).toHaveBeenCalledWith({
      where: { id: 'offer-1' },
      select: expect.objectContaining({
        shop: expect.any(Object),
      }),
    });
  });
});
