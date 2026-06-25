import { ShopController } from './shop.controller';

describe('ShopController', () => {
  it('lists public shops with pagination defaults', async () => {
    const shopsRpcService = {
      findPublic: jest.fn().mockResolvedValue({
        total: 1,
        page: 1,
        pageSize: 20,
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
      }),
    };
    const controller = new ShopController(shopsRpcService as never);

    await expect(controller.findPublic({})).resolves.toEqual({
      total: 1,
      page: 1,
      pageSize: 20,
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
    expect(shopsRpcService.findPublic).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
    });
  });

  it('gets public shop summary by offer id', async () => {
    const shopsRpcService = {
      findByOffer: jest.fn().mockResolvedValue({
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
      }),
    };
    const controller = new ShopController(shopsRpcService as never);

    await expect(controller.findByOfferId('offer-1')).resolves.toEqual({
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
    expect(shopsRpcService.findByOffer).toHaveBeenCalledWith({ offerId: 'offer-1' });
  });

  it('gets public shop detail by shop id', async () => {
    const shopsRpcService = {
      findById: jest.fn().mockResolvedValue({
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
      }),
    };
    const controller = new ShopController(shopsRpcService as never);

    await expect(controller.findById('shop-1')).resolves.toEqual({
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
    expect(shopsRpcService.findById).toHaveBeenCalledWith({ id: 'shop-1' });
  });
});
