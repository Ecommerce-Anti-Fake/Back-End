import { Test, TestingModule } from '@nestjs/testing';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { GetSellerShopDashboardAnalyticsUseCase } from './get-seller-shop-dashboard-analytics.use-case';

describe('GetSellerShopDashboardAnalyticsUseCase', () => {
  let useCase: GetSellerShopDashboardAnalyticsUseCase;

  const ordersRepositoryMock = {
    findOrdersForSellerShop: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetSellerShopDashboardAnalyticsUseCase,
        { provide: OrdersRepository, useValue: ordersRepositoryMock },
      ],
    }).compile();

    useCase = module.get<GetSellerShopDashboardAnalyticsUseCase>(GetSellerShopDashboardAnalyticsUseCase);
  });

  it('aggregates seller dashboard metrics from owned shop orders', async () => {
    const today = startOfDay(new Date());
    const yesterday = addDays(today, -1);
    const previousPeriod = addDays(today, -8);

    ordersRepositoryMock.findOrdersForSellerShop.mockResolvedValueOnce([
      createOrder({
        id: 'order-1',
        buyerUserId: 'buyer-1',
        createdAt: today,
        sellerReceivableAmount: 500,
        items: [
          createItem({ offerId: 'offer-1', title: 'Nước hoa AntiFake Premium', quantity: 2, unitPrice: 250 }),
        ],
      }),
      createOrder({
        id: 'order-2',
        buyerUserId: 'buyer-2',
        createdAt: yesterday,
        sellerReceivableAmount: 300,
        items: [
          createItem({ offerId: 'offer-1', title: 'Nước hoa AntiFake Premium', quantity: 1, unitPrice: 300 }),
          createItem({ offerId: 'offer-2', title: 'Giày Sneaker AF Luxury', quantity: 3, unitPrice: 100 }),
        ],
      }),
      createOrder({
        id: 'order-previous',
        buyerUserId: 'buyer-old',
        createdAt: previousPeriod,
        sellerReceivableAmount: 400,
        items: [
          createItem({ offerId: 'offer-3', title: 'Túi da AntiFake Classic', quantity: 1, unitPrice: 400 }),
        ],
      }),
    ]);

    const result = await useCase.execute({ requesterUserId: 'seller-1', shopId: 'shop-1', days: 7 });

    expect(ordersRepositoryMock.findOrdersForSellerShop).toHaveBeenCalledWith({
      requesterUserId: 'seller-1',
      shopId: 'shop-1',
    });
    expect(result.stats.revenue.value).toBe(800);
    expect(result.stats.revenue.growthPercent).toBe(100);
    expect(result.stats.orders.value).toBe(2);
    expect(result.stats.newCustomers.value).toBe(2);
    expect(result.series).toHaveLength(7);
    expect(result.series.at(-1)).toMatchObject({ revenue: 500, orders: 1 });
    expect(result.topProducts[0]).toMatchObject({
      offerId: 'offer-1',
      title: 'Nước hoa AntiFake Premium',
      soldQuantity: 3,
      revenue: 800,
    });
    expect(result.recentOrders.map((order) => order.id)).toEqual(['order-1', 'order-2']);
    expect(result.revenueOrders[0]).toMatchObject({
      orderId: 'order-1',
      sellerReceivableAmount: 500,
      itemCount: 2,
    });
  });

  it('uses explicit date filters for the revenue drilldown range', async () => {
    ordersRepositoryMock.findOrdersForSellerShop.mockResolvedValueOnce([
      createOrder({
        id: 'inside-range',
        createdAt: new Date('2026-05-10T10:00:00.000Z'),
        sellerReceivableAmount: 700,
        items: [createItem({ offerId: 'offer-1', title: 'Product A', quantity: 1, unitPrice: 700 })],
      }),
      createOrder({
        id: 'outside-range',
        createdAt: new Date('2026-05-12T10:00:00.000Z'),
        sellerReceivableAmount: 900,
        items: [createItem({ offerId: 'offer-2', title: 'Product B', quantity: 1, unitPrice: 900 })],
      }),
    ]);

    const result = await useCase.execute({
      requesterUserId: 'seller-1',
      shopId: 'shop-1',
      fromDate: '2026-05-09',
      toDate: '2026-05-10',
    });

    expect(result.range.days).toBe(2);
    expect(result.stats.revenue.value).toBe(700);
    expect(result.series).toHaveLength(2);
    expect(result.revenueOrders.map((order) => order.orderId)).toEqual(['inside-range']);
  });

  it('scopes revenue and product metrics to the requested shop group', async () => {
    ordersRepositoryMock.findOrdersForSellerShop.mockResolvedValueOnce([
      createOrder({
        id: 'multi-shop-order',
        createdAt: new Date('2026-05-10T10:00:00.000Z'),
        buyerPayableAmount: 4200,
        sellerReceivableAmount: 3500,
        totalAmount: 4200,
        shippingFeeAmount: 700,
        shopGroups: [
          createShopGroup({ id: 'group-shop-1', shopId: 'shop-1', sellerReceivableAmount: 1000, platformFeeAmount: 50, shippingFeeAmount: 200 }),
          createShopGroup({ id: 'group-shop-2', shopId: 'shop-2', sellerReceivableAmount: 2500, platformFeeAmount: 125, shippingFeeAmount: 500 }),
        ],
        items: [
          createItem({ offerId: 'offer-shop-1', title: 'Shop 1 Product', quantity: 2, unitPrice: 500, orderShopGroupId: 'group-shop-1', shopId: 'shop-1' }),
          createItem({ offerId: 'offer-shop-2', title: 'Shop 2 Product', quantity: 5, unitPrice: 500, orderShopGroupId: 'group-shop-2', shopId: 'shop-2' }),
        ],
      }),
    ]);

    const result = await useCase.execute({
      requesterUserId: 'seller-1',
      shopId: 'shop-1',
      fromDate: '2026-05-10',
      toDate: '2026-05-10',
    });

    expect(result.stats.revenue.value).toBe(1000);
    expect(result.series[0]).toMatchObject({ revenue: 1000, orders: 1 });
    expect(result.topProducts).toEqual([
      expect.objectContaining({ offerId: 'offer-shop-1', soldQuantity: 2, revenue: 1000 }),
    ]);
    expect(result.revenueOrders[0]).toMatchObject({
      orderId: 'multi-shop-order',
      platformFeeAmount: 50,
      sellerReceivableAmount: 1000,
      itemCount: 2,
    });
  });
});

function createOrder(overrides: Record<string, unknown>) {
  return {
    id: 'order-id',
    orderStatus: 'pending',
    fulfillmentStatus: 'PENDING',
    shopId: 'shop-1',
    shop: { shopName: 'Seller Shop', ownerUserId: 'seller-1' },
    buyerUserId: null,
    buyerShopId: null,
    buyerDistributionNodeId: null,
    baseAmount: 0,
    discountAmount: 0,
    platformFeeAmount: 0,
    buyerPayableAmount: 0,
    sellerReceivableAmount: 0,
    totalAmount: 0,
    shippingName: null,
    shippingPhone: null,
    shippingAddress: null,
    shippingDistrictId: null,
    shippingDistrictName: null,
    shippingWardCode: null,
    shippingWardName: null,
    shippingProviderCode: null,
    shippingProviderName: null,
    shippingServiceId: null,
    shippingServiceTypeId: null,
    shippingFeeAmount: 0,
    shippingTrackingCode: null,
    parcelWeightGrams: null,
    parcelLengthCm: null,
    parcelWidthCm: null,
    parcelHeightCm: null,
    paymentIntent: null,
    escrow: null,
    disputes: [],
    shopGroups: [],
    items: [],
    createdAt: new Date(),
    ...overrides,
  };
}

function createItem(input: { offerId: string; title: string; quantity: number; unitPrice: number; orderShopGroupId?: string; shopId?: string }) {
  return {
    id: `${input.offerId}-item`,
    offerId: input.offerId,
    orderShopGroupId: input.orderShopGroupId ?? null,
    offerTitleSnapshot: input.title,
    unitPrice: input.unitPrice,
    quantity: input.quantity,
    reviews: [],
    batchAllocations: [],
    offer: { shop: input.shopId ? { id: input.shopId } : undefined, media: [] },
  };
}

function createShopGroup(overrides: Record<string, unknown>) {
  return {
    id: 'group-id',
    shopId: 'shop-1',
    shop: { id: 'shop-1', shopName: 'Seller Shop', ownerUserId: 'seller-1' },
    fulfillmentStatus: 'PENDING',
    baseAmount: 0,
    discountAmount: 0,
    platformFeeAmount: 0,
    sellerReceivableAmount: 0,
    shippingFeeAmount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
