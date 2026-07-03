import { GetShopBestSellingProductsUseCase } from './get-shop-best-selling-products.use-case';

describe('GetShopBestSellingProductsUseCase', () => {
  it('aggregates completed delivered items for only the requested shop', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        offerId: 'offer-1',
        offerTitleSnapshot: 'Kem chong nang SPF50',
        quantity: 2,
        offer: {
          price: 150000,
          currency: 'VND',
          availableQuantity: 500,
          verificationLevel: 'standard',
          offerStatus: 'active',
          createdAt: new Date('2026-04-14T10:00:00.000Z'),
          media: [
            {
              mediaType: 'thumbnail',
              fileUrl: 'fallback.jpg',
              mediaAsset: { secureUrl: 'secure.jpg' },
            },
          ],
        },
      },
      {
        offerId: 'offer-1',
        offerTitleSnapshot: 'Kem chong nang SPF50',
        quantity: 3,
        offer: {
          price: 150000,
          currency: 'VND',
          availableQuantity: 500,
          verificationLevel: 'standard',
          offerStatus: 'active',
          createdAt: new Date('2026-04-14T10:00:00.000Z'),
          media: [],
        },
      },
    ]);
    const useCase = new GetShopBestSellingProductsUseCase({
      orderItem: { findMany },
    } as never);

    await expect(useCase.execute('shop-1', 4)).resolves.toEqual([
      expect.objectContaining({
        id: 'offer-1',
        soldQuantity: 5,
        thumbnailUrl: 'secure.jpg',
      }),
    ]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          orderShopGroup: {
            is: { shopId: 'shop-1', fulfillmentStatus: 'DELIVERED' },
          },
          order: { orderStatus: 'completed' },
        },
      }),
    );
  });

  it('sorts by sold quantity and applies the requested limit', async () => {
    const offer = {
      price: 100000,
      currency: 'VND',
      availableQuantity: 10,
      verificationLevel: 'standard',
      offerStatus: 'active',
      createdAt: new Date('2026-04-14T10:00:00.000Z'),
      media: [],
    };
    const findMany = jest.fn().mockResolvedValue([
      { offerId: 'offer-1', offerTitleSnapshot: 'A', quantity: 2, offer },
      { offerId: 'offer-2', offerTitleSnapshot: 'B', quantity: 7, offer },
    ]);
    const useCase = new GetShopBestSellingProductsUseCase({
      orderItem: { findMany },
    } as never);

    const result = await useCase.execute('shop-1', 1);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'offer-2', soldQuantity: 7 });
  });
});
