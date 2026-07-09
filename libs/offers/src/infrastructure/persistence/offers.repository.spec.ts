import { OffersRepository } from './offers.repository';

describe('OffersRepository', () => {
  it('finds a brand by case-insensitive exact name', async () => {
    const prisma = {
      brand: { findFirst: jest.fn().mockResolvedValue({ id: 'brand-1' }) },
    };
    const repository = new OffersRepository(prisma as never);

    await repository.findBrandByName('Nike');

    expect(prisma.brand.findFirst).toHaveBeenCalledWith({
      where: { name: { equals: 'Nike', mode: 'insensitive' } },
      select: { id: true },
    });
  });

  it('creates a brand with the supplied registry status', async () => {
    const prisma = {
      brand: { create: jest.fn().mockResolvedValue({ id: 'brand-1' }) },
    };
    const repository = new OffersRepository(prisma as never);

    await repository.createBrand({
      name: 'No brand',
      registryStatus: 'seller_declared',
    });

    expect(prisma.brand.create).toHaveBeenCalledWith({
      data: { name: 'No brand', registryStatus: 'seller_declared' },
      select: { id: true },
    });
  });

  it('loads offer sales options in deterministic display order', async () => {
    const prisma = { offer: { findUnique: jest.fn().mockResolvedValue(null) } };
    const repository = new OffersRepository(prisma as never);

    await repository.findOfferById('offer-1');

    const query = prisma.offer.findUnique.mock.calls[0][0];
    expect(query.include.optionGroups).toEqual(
      expect.objectContaining({
        orderBy: { createdAt: 'asc' },
      }),
    );
    expect(query.include.optionGroups.select.values.orderBy).toEqual([
      { sortOrder: 'asc' },
      { createdAt: 'asc' },
    ]);
    expect(
      query.include.optionGroups.select.values.select.mediaAsset.select,
    ).toEqual({ id: true, secureUrl: true });
    expect(query.include).not.toHaveProperty('variants');
  });

  it('creates variant option links through nested persistence', async () => {
    const prisma = {
      offerVariant: {
        create: jest.fn().mockResolvedValue({ id: 'variant-1' }),
      },
    };
    const repository = new OffersRepository(prisma as never);

    await repository.createOfferVariant({
      offerId: 'offer-1',
      sku: 'RED-M',
      price: 120000,
      availableQuantity: 5,
      mediaAssetId: null,
      isActive: true,
      optionValueIds: ['m-id', 'red-id'],
    });

    expect(prisma.offerVariant.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          offerId: 'offer-1',
          values: {
            create: [{ optionValueId: 'm-id' }, { optionValueId: 'red-id' }],
          },
        }),
      }),
    );
  });

  it('updates only moderation fields', async () => {
    const prisma = {
      offer: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn().mockResolvedValue({ id: 'offer-1' }),
      },
    };
    const repository = new OffersRepository(prisma as never);

    await repository.moderateOffer('offer-1', {
      moderationStatus: 'rejected',
      moderationReason: 'Invalid claims',
    });

    expect(prisma.offer.updateMany).toHaveBeenCalledWith({
      where: { id: 'offer-1' },
      data: {
        moderationStatus: 'rejected',
        moderationReason: 'Invalid claims',
      },
    });
    expect(prisma.offer.findUnique).toHaveBeenCalled();
  });
  it('applies only provided status filters to the admin offer list', async () => {
    const prisma = {
      offer: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn((queries) => Promise.all(queries)),
    };
    const repository = new OffersRepository(prisma as never);

    await repository.findAdminOffers({
      moderationStatus: 'pending',
      page: 2,
      pageSize: 10,
    });

    expect(prisma.offer.count).toHaveBeenCalledWith({
      where: { moderationStatus: 'pending' },
    });
    expect(prisma.offer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { moderationStatus: 'pending' },
        orderBy: { createdAt: 'desc' },
        skip: 10,
        take: 10,
      }),
    );
    const query = prisma.offer.findMany.mock.calls[0][0];
    expect(query.select.media).toEqual(
      expect.objectContaining({
        orderBy: { createdAt: 'asc' },
        select: expect.objectContaining({ mediaType: true }),
      }),
    );
    expect(query.select.media.take).toBeUndefined();
  });

  it('lists all offers when admin status filters are omitted', async () => {
    const prisma = {
      offer: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn((queries) => Promise.all(queries)),
    };
    const repository = new OffersRepository(prisma as never);

    await repository.findAdminOffers({ page: 1, pageSize: 10 });

    expect(prisma.offer.count).toHaveBeenCalledWith({ where: {} });
    expect(prisma.offer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it('should apply public catalog search filters to offer queries', async () => {
    const prisma = {
      offer: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const repository = new OffersRepository(prisma as never);

    await repository.findAllOffers({
      q: 'spf',
      categoryId: 'category-1',
      brandId: 'brand-1',
      minPrice: 100000,
      maxPrice: 500000,
      location: 'VN',
      shopType: 'MANUFACTURER',
      sort: 'price-asc',
    });

    expect(prisma.offer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          offerStatus: 'active',
          categoryId: 'category-1',
          price: {
            gte: 100000,
            lte: 500000,
          },
          brandId: 'brand-1',
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
        { modelName: { contains: 'spf', mode: 'insensitive' } },
        { brand: { is: { name: { contains: 'spf', mode: 'insensitive' } } } },
      ]),
    );
  });

  it('should return paginated offers when page and page size are provided', async () => {
    const prisma = {
      offer: {
        count: jest.fn().mockResolvedValue(21),
        findMany: jest.fn().mockResolvedValue([{ id: 'offer-1' }]),
      },
      $transaction: jest.fn((queries) => Promise.all(queries)),
    };
    const repository = new OffersRepository(prisma as never);

    await expect(
      repository.findAllOffers({ page: 2, pageSize: 10 }),
    ).resolves.toEqual({
      total: 21,
      page: 2,
      pageSize: 10,
      items: [{ id: 'offer-1' }],
    });

    expect(prisma.offer.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ offerStatus: 'active' }),
    });
    expect(prisma.offer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
      }),
    );
  });

  it('applies provided shop offer status filters', async () => {
    const prisma = {
      offer: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn((queries) => Promise.all(queries)),
    };
    const repository = new OffersRepository(prisma as never);

    await repository.findAllOffers({
      shopId: 'shop-1',
      offerStatus: 'inactive',
      moderationStatus: 'pending',
      page: 1,
      pageSize: 20,
    });

    expect(prisma.offer.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        shopId: 'shop-1',
        offerStatus: 'inactive',
        moderationStatus: 'pending',
      }),
    });
  });

  it('lists every shop offer when includeInactive is true and status filters are omitted', async () => {
    const prisma = {
      offer: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn((queries) => Promise.all(queries)),
    };
    const repository = new OffersRepository(prisma as never);

    await repository.findAllOffers({
      shopId: 'shop-1',
      includeInactive: true,
      page: 1,
      pageSize: 20,
    });

    expect(prisma.offer.count).toHaveBeenCalledWith({
      where: { shopId: 'shop-1' },
    });
    expect(prisma.offer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { shopId: 'shop-1' },
      }),
    );
  });
});
