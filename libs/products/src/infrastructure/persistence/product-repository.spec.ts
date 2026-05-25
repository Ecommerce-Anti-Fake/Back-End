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
});
