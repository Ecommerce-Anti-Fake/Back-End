import { GetShopBestSellingProductsUseCase } from './get-shop-best-selling-products.use-case';

describe('GetShopBestSellingProductsUseCase', () => {
  it('aggregates completed delivered items for only the requested shop', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        offerId: 'offer-1',
        offerTitleSnapshot: 'Kem chong nang SPF50',
        quantity: 2,
        offer: {
          shopId: 'shop-1',
          price: 150000,
          currency: 'VND',
          availableQuantity: 500,
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
          shopId: 'shop-1',
          price: 150000,
          currency: 'VND',
          availableQuantity: 500,
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
          offer: { shopId: 'shop-1' },
          order: { orderStatus: 'completed' },
        },
      }),
    );
  });

  it('excludes items whose offer belongs to another shop even if the shop group matches', async () => {
    const items = [
      createItem({
        offerId: 'offer-1',
        title: 'Same shop offer',
        quantity: 2,
        offerShopId: 'shop-1',
      }),
      createItem({
        offerId: 'offer-foreign',
        title: 'Foreign shop offer',
        quantity: 10,
        offerShopId: 'shop-2',
      }),
    ];
    const findMany = jest.fn(({ where }) =>
      Promise.resolve(
        items.filter((item) => item.offer.shopId === where.offer?.shopId),
      ),
    );
    const useCase = new GetShopBestSellingProductsUseCase({
      orderItem: { findMany },
    } as never);

    const result = await useCase.execute('shop-1', 10);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          orderShopGroup: {
            is: { shopId: 'shop-1', fulfillmentStatus: 'DELIVERED' },
          },
          offer: { shopId: 'shop-1' },
          order: { orderStatus: 'completed' },
        }),
      }),
    );
    expect(result).toEqual([
      expect.objectContaining({
        id: 'offer-1',
        title: 'Same shop offer',
        soldQuantity: 2,
      }),
    ]);
    expect(result).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'offer-foreign' }),
      ]),
    );
  });

  it('sorts by sold quantity and applies the requested limit', async () => {
    const offer = {
      shopId: 'shop-1',
      price: 100000,
      currency: 'VND',
      availableQuantity: 10,
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

function createItem(input: {
  offerId: string;
  title: string;
  quantity: number;
  offerShopId: string;
}) {
  return {
    offerId: input.offerId,
    offerTitleSnapshot: input.title,
    quantity: input.quantity,
    offer: {
      shopId: input.offerShopId,
      price: 100000,
      currency: 'VND',
      availableQuantity: 10,
      offerStatus: 'active',
      createdAt: new Date('2026-04-14T10:00:00.000Z'),
      media: [],
    },
  };
}
