import { ProductRepository } from './product-repository';

describe('ProductRepository', () => {
  it('should apply public catalog search filters to offer queries', async () => {
    const prisma = {
      offer: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const repository = new ProductRepository(prisma as never);

    await repository.findAllOffers({
      q: 'spf',
      categoryId: 'category-1',
      brandId: 'brand-1',
      minPrice: 100000,
      maxPrice: 500000,
      location: 'VN',
      verificationStatus: 'standard',
      shopType: 'MANUFACTURER',
      salesChannel: 'retail',
      sort: 'price-asc',
    });

    expect(prisma.offer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          offerStatus: 'active',
          categoryId: 'category-1',
          verificationLevel: 'standard',
          salesMode: { in: ['RETAIL', 'BOTH'] },
          price: {
            gte: 100000,
            lte: 500000,
          },
          productModel: {
            is: {
              brandId: 'brand-1',
            },
          },
          shop: {
            is: {
              registrationType: 'MANUFACTURER',
            },
          },
          batchLinks: {
            some: {
              batch: {
                OR: [
                  { countryOfOrigin: { contains: 'VN', mode: 'insensitive' } },
                  { sourceName: { contains: 'VN', mode: 'insensitive' } },
                ],
              },
            },
          },
        }),
        orderBy: { price: 'asc' },
      }),
    );
    const call = prisma.offer.findMany.mock.calls[0][0];
    expect(call.where.OR).toEqual(
      expect.arrayContaining([
        { title: { contains: 'spf', mode: 'insensitive' } },
        { productModel: { is: { brand: { is: { name: { contains: 'spf', mode: 'insensitive' } } } } } },
      ]),
    );
  });

  it('should persist favorite offers idempotently per user and offer', async () => {
    const prisma = {
      offer: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'offer-1' }),
      },
      userFavoriteOffer: {
        upsert: jest.fn().mockResolvedValue({ id: 'favorite-1' }),
      },
    };
    const repository = new ProductRepository(prisma as never);

    await expect(repository.addFavoriteOffer('user-1', 'offer-1')).resolves.toEqual({
      offerId: 'offer-1',
      isFavorite: true,
    });

    expect(prisma.offer.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: 'offer-1' },
      select: { id: true },
    });
    expect(prisma.userFavoriteOffer.upsert).toHaveBeenCalledWith({
      where: {
        userId_offerId: {
          userId: 'user-1',
          offerId: 'offer-1',
        },
      },
      update: {},
      create: {
        userId: 'user-1',
        offerId: 'offer-1',
      },
    });
  });

  it('should list and remove favorite offers for a user', async () => {
    const prisma = {
      userFavoriteOffer: {
        findMany: jest.fn().mockResolvedValue([{ offerId: 'offer-2' }, { offerId: 'offer-1' }]),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const repository = new ProductRepository(prisma as never);

    await expect(repository.listFavoriteOfferIds('user-1')).resolves.toEqual(['offer-2', 'offer-1']);
    expect(prisma.userFavoriteOffer.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { createdAt: 'desc' },
      select: { offerId: true },
    });

    await expect(repository.removeFavoriteOffer('user-1', 'offer-1')).resolves.toEqual({
      offerId: 'offer-1',
      isFavorite: false,
    });
    expect(prisma.userFavoriteOffer.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        offerId: 'offer-1',
      },
    });
  });
});
