import { ShopController } from './shop.controller';

describe('ShopController', () => {
  function createController(shopsRpcService: Record<string, unknown>, ordersRpcService: Record<string, unknown> = {}) {
    return new ShopController(shopsRpcService as never, ordersRpcService as never);
  }

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
    const controller = createController(shopsRpcService);

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
    const controller = createController(shopsRpcService);

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
    const controller = createController(shopsRpcService);

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

  it('lists public approved categories by shop id', async () => {
    const shopsRpcService = {
      findCategoriesByShopId: jest.fn().mockResolvedValue([
        {
          categoryId: 'category-1',
          categoryName: 'My pham',
        },
      ]),
    };
    const controller = createController(shopsRpcService);

    await expect(controller.findCategoriesByShopId('shop-1')).resolves.toEqual([
      {
        categoryId: 'category-1',
        categoryName: 'My pham',
      },
    ]);
    expect(shopsRpcService.findCategoriesByShopId).toHaveBeenCalledWith({ shopId: 'shop-1' });
  });

  it('gets seller shop summary metrics from the shop route', async () => {
    const shopsRpcService = {};
    const ordersRpcService = {
      getSellerShopSummaryMetrics: jest.fn().mockResolvedValue({
        range: {
          from: '2026-06-01T00:00:00.000Z',
          to: '2026-06-29T23:59:59.999Z',
          days: 29,
        },
        revenue: { value: 128500000, growthPercent: 12.5 },
        orders: { value: 432, growthPercent: 9.2 },
        offers: { value: 1024, growthPercent: -2.1 },
      }),
    };
    const controller = createController(shopsRpcService, ordersRpcService);

    const result = await controller.getSummaryMetrics('shop-1', 'seller-1', {
      from: '2026-06-01',
      to: '2026-06-29',
    });

    expect(ordersRpcService.getSellerShopSummaryMetrics).toHaveBeenCalledWith({
      shopId: 'shop-1',
      requesterUserId: 'seller-1',
      from: '2026-06-01',
      to: '2026-06-29',
    });
    expect(result).toMatchObject({
      revenue: { value: 128500000 },
      orders: { value: 432 },
      offers: { value: 1024 },
    });
  });

  it('gets seller shop dashboard analytics from the shop route', async () => {
    const shopsRpcService = {};
    const ordersRpcService = {
      getSellerShopDashboardAnalytics: jest.fn().mockResolvedValue({
        range: {
          from: '2026-06-01T00:00:00.000Z',
          to: '2026-06-29T23:59:59.999Z',
          days: 29,
        },
        stats: {
          revenue: { value: 128500000, growthPercent: -12.5 },
        },
      }),
    };
    const controller = createController(shopsRpcService, ordersRpcService);

    const result = await controller.getDashboardAnalytics('shop-1', 'seller-1', {
      days: 7,
      fromDate: '2026-06-01',
      toDate: '2026-06-29',
    });

    expect(ordersRpcService.getSellerShopDashboardAnalytics).toHaveBeenCalledWith({
      shopId: 'shop-1',
      requesterUserId: 'seller-1',
      days: 7,
      fromDate: '2026-06-01',
      toDate: '2026-06-29',
    });
    expect(result).toMatchObject({
      stats: {
        revenue: { value: 128500000, growthPercent: -12.5 },
      },
    });
  });
});
