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
            shopStatus: 'verified',
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
        where: { shopStatus: 'verified' },
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
          shopStatus: 'verified',
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

  it('returns a public shop detail by shop id', async () => {
    const prisma = {
      shop: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'shop-1',
          shopName: 'Shop ABC',
          shopStatus: 'verified',
          createdAt: new Date('2026-06-24T02:00:00.000Z'),
          avatarMedia: {
            secureUrl: 'https://cdn.test/shop-avatar.jpg',
          },
          bannerMedia: {
            secureUrl: 'https://cdn.test/shop-banner.jpg',
          },
          _count: {
            offers: 8,
          },
        }),
      },
      review: {
        aggregate: jest.fn().mockResolvedValue({
          _avg: { rating: 4.666 },
          _count: { _all: 3 },
        }),
      },
      orderItem: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { quantity: 21 },
        }),
      },
    };
    const repository = new ShopsRepository(prisma as never);

    await expect(repository.findPublicShopDetailById('shop-1')).resolves.toEqual({
      shopId: 'shop-1',
      shopName: 'Shop ABC',
      shopAvatar: 'https://cdn.test/shop-avatar.jpg',
      shopBanner: 'https://cdn.test/shop-banner.jpg',
      rating: 4.7,
      totalOffer: 8,
      totalSale: 21,
      totalReview: 3,
      createdAt: '2026-06-24T02:00:00.000Z',
      verify: true,
    });

    expect(prisma.shop.findUnique).toHaveBeenCalledWith({
      where: { id: 'shop-1' },
      select: expect.objectContaining({
        id: true,
        shopName: true,
      }),
    });
  });

  it('returns approved public shop categories by shop id', async () => {
    const prisma = {
      shop: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'shop-1',
          shopStatus: 'verified',
          registeredCategories: [
            {
              category: {
                id: 'category-1',
                name: 'My pham',
              },
            },
          ],
        }),
      },
    };
    const repository = new ShopsRepository(prisma as never);

    await expect(repository.findPublicShopCategoriesByShopId('shop-1')).resolves.toEqual([
      {
        categoryId: 'category-1',
        categoryName: 'My pham',
      },
    ]);

    expect(prisma.shop.findUnique).toHaveBeenCalledWith({
      where: { id: 'shop-1' },
      select: expect.objectContaining({
        id: true,
        shopStatus: true,
        registeredCategories: expect.objectContaining({
          where: { registrationStatus: 'approved' },
        }),
      }),
    });
  });

  it('recomputes approved KYC normal shop as pending verification until shop document approval', async () => {
    const prisma = {
      shop: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'shop-1',
          registrationType: 'NORMAL',
          owner: {
            kyc: {
              verificationStatus: 'approved',
              documents: [{ side: 'FRONT' }, { side: 'BACK' }],
            },
          },
          documents: [],
          registeredCategories: [
            {
              registrationStatus: 'pending',
              category: {
                riskTier: 'HIGH',
              },
            },
          ],
        }),
        update: jest.fn().mockResolvedValue({
          id: 'shop-1',
          shopStatus: 'pending_verification',
          registeredCategories: [],
        }),
      },
    };
    const repository = new ShopsRepository(prisma as never);

    await expect(repository.recomputeShopStatus('shop-1')).resolves.toMatchObject({
      id: 'shop-1',
      shopStatus: 'pending_verification',
    });

    expect(prisma.shop.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'shop-1' },
        data: { shopStatus: 'pending_verification' },
      }),
    );
  });

  it('recomputes approved KYC normal shop as verified after shop document approval', async () => {
    const prisma = {
      shop: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'shop-1',
          registrationType: 'NORMAL',
          owner: {
            kyc: {
              verificationStatus: 'approved',
              documents: [{ side: 'FRONT' }, { side: 'BACK' }],
            },
          },
          documents: [{ reviewStatus: 'approved' }],
          registeredCategories: [
            {
              registrationStatus: 'approved',
              category: {
                riskTier: 'HIGH',
              },
            },
          ],
        }),
        update: jest.fn().mockResolvedValue({
          id: 'shop-1',
          shopStatus: 'verified',
          registeredCategories: [],
        }),
      },
    };
    const repository = new ShopsRepository(prisma as never);

    await expect(repository.recomputeShopStatus('shop-1')).resolves.toMatchObject({
      id: 'shop-1',
      shopStatus: 'verified',
    });

    expect(prisma.shop.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'shop-1' },
        data: { shopStatus: 'verified' },
      }),
    );
  });
});
