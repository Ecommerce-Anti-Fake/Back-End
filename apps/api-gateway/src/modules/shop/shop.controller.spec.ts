import { ShopController } from './shop.controller';

describe('ShopController', () => {
  function createController(
    shopsRpcService: Record<string, unknown>,
    ordersRpcService: Record<string, unknown> = {},
  ) {
    return new ShopController(
      shopsRpcService as never,
      ordersRpcService as never,
    );
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

  it('forwards avatar and banner when updating the owned shop profile', async () => {
    const shopsRpcService = { updateProfile: jest.fn().mockResolvedValue({ success: true }) };
    const controller = createController(shopsRpcService);
    const avatar = { buffer: Buffer.from('avatar'), mimetype: 'image/png', size: 6 };
    const banner = { buffer: Buffer.from('banner'), mimetype: 'image/png', size: 6 };

    await expect(controller.updateProfile(
      'shop-1', 'user-1', { shopName: 'Shop ABC' }, { avatar: [avatar], banner: [banner] },
    )).resolves.toEqual({ success: true });

    expect(shopsRpcService.updateProfile).toHaveBeenCalledWith(expect.objectContaining({
      shopId: 'shop-1', requesterUserId: 'user-1', shopName: 'Shop ABC', avatar, banner,
    }));
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
    expect(shopsRpcService.findByOffer).toHaveBeenCalledWith({
      offerId: 'offer-1',
    });
  });

  it('lists brand authorizations for an owned shop', async () => {
    const authorizations = [{
      id: 'authorization-1',
      shopId: 'shop-1',
      brandId: 'brand-1',
      brandName: 'Brand A',
      verificationStatus: 'approved',
    }];
    const shopsRpcService = {
      findBrandAuthorizations: jest.fn().mockResolvedValue(authorizations),
    };
    const controller = createController(shopsRpcService);

    await expect(
      controller.findBrandAuthorizations('shop-1', 'seller-1'),
    ).resolves.toEqual(authorizations);
    expect(shopsRpcService.findBrandAuthorizations).toHaveBeenCalledWith({
      shopId: 'shop-1',
      requesterUserId: 'seller-1',
    });
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
    expect(shopsRpcService.findCategoriesByShopId).toHaveBeenCalledWith({
      shopId: 'shop-1',
    });
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

  it('gets seller shop order status summary from the shop route', async () => {
    const ordersRpcService = {
      getSellerShopOrderStatusSummary: jest.fn().mockResolvedValue({
        totalOrders: 1284,
        pendingOrders: 42,
        shippingOrders: 156,
        completedOrders: 1086,
      }),
    };
    const controller = createController({}, ordersRpcService);

    await expect(
      controller.getOrderStatusSummary('shop-1', 'seller-1'),
    ).resolves.toEqual({
      totalOrders: 1284,
      pendingOrders: 42,
      shippingOrders: 156,
      completedOrders: 1086,
    });
    expect(
      ordersRpcService.getSellerShopOrderStatusSummary,
    ).toHaveBeenCalledWith({
      shopId: 'shop-1',
      requesterUserId: 'seller-1',
    });
  });

  it('gets seller shop daily metrics from the shop route', async () => {
    const ordersRpcService = {
      getSellerShopDailyMetrics: jest.fn().mockResolvedValue({
        range: {
          days: 2,
          from: '2026-06-10T00:00:00.000Z',
          to: '2026-06-11T23:59:59.999Z',
        },
        series: [
          { date: '2026-06-10', label: '10/06', revenue: 1200, orders: 2 },
          { date: '2026-06-11', label: '11/06', revenue: 600, orders: 1 },
        ],
      }),
    };
    const controller = createController({}, ordersRpcService);

    const result = await controller.getDailyMetrics('shop-1', 'seller-1', {
      days: 7,
      fromDate: '2026-06-10',
      toDate: '2026-06-11',
    });

    expect(ordersRpcService.getSellerShopDailyMetrics).toHaveBeenCalledWith({
      shopId: 'shop-1',
      requesterUserId: 'seller-1',
      days: 7,
      fromDate: '2026-06-10',
      toDate: '2026-06-11',
    });
    expect(result).toMatchObject({
      series: [
        { date: '2026-06-10', revenue: 1200, orders: 2 },
        { date: '2026-06-11', revenue: 600, orders: 1 },
      ],
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

    const result = await controller.getDashboardAnalytics(
      'shop-1',
      'seller-1',
      {
        days: 7,
        fromDate: '2026-06-01',
        toDate: '2026-06-29',
      },
    );

    expect(
      ordersRpcService.getSellerShopDashboardAnalytics,
    ).toHaveBeenCalledWith({
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

  it('gets best-selling products with the default limit', async () => {
    const ordersRpcService = {
      getShopBestSellingProducts: jest.fn().mockResolvedValue([]),
    };
    const controller = createController({}, ordersRpcService);

    await expect(
      controller.getBestSellingProducts('shop-1', {}),
    ).resolves.toEqual([]);
    expect(ordersRpcService.getShopBestSellingProducts).toHaveBeenCalledWith({
      shopId: 'shop-1',
      limit: 10,
    });
  });
});
