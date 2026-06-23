import { ProductRepository } from './product-repository';

describe('ProductRepository', () => {
  it('should apply public catalog search filters to offer queries', async () => {
    const prisma = {
      offer: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
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
    const repository = new ProductRepository(prisma as never);

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
});
