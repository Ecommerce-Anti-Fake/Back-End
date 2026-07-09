import { Test, TestingModule } from '@nestjs/testing';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { GetSellerShopSummaryMetricsUseCase } from './get-seller-shop-summary-metrics.use-case';

describe('GetSellerShopSummaryMetricsUseCase', () => {
  let useCase: GetSellerShopSummaryMetricsUseCase;

  const ordersRepositoryMock = {
    findOrdersForSellerShop: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetSellerShopSummaryMetricsUseCase,
        { provide: OrdersRepository, useValue: ordersRepositoryMock },
      ],
    }).compile();

    useCase = module.get<GetSellerShopSummaryMetricsUseCase>(GetSellerShopSummaryMetricsUseCase);
  });

  it('returns summary metrics for the requested date range', async () => {
    ordersRepositoryMock.findOrdersForSellerShop.mockResolvedValueOnce([
      createOrder({
        id: 'order-1',
        createdAt: new Date('2026-06-10T10:00:00.000Z'),
        sellerReceivableAmount: 800,
        items: [
          createItem({ offerId: 'offer-1', quantity: 2 }),
          createItem({ offerId: 'offer-2', quantity: 1 }),
        ],
      }),
      createOrder({
        id: 'order-2',
        createdAt: new Date('2026-06-11T10:00:00.000Z'),
        sellerReceivableAmount: 400,
        items: [createItem({ offerId: 'offer-1', quantity: 1 })],
      }),
      createOrder({
        id: 'previous-order',
        createdAt: new Date('2026-06-08T10:00:00.000Z'),
        sellerReceivableAmount: 600,
        items: [createItem({ offerId: 'offer-3', quantity: 2 })],
      }),
      createOrder({
        id: 'outside-order',
        createdAt: new Date('2026-06-12T10:00:00.000Z'),
        sellerReceivableAmount: 999,
        items: [createItem({ offerId: 'offer-4', quantity: 1 })],
      }),
    ]);

    const result = await useCase.execute({
      requesterUserId: 'seller-1',
      shopId: 'shop-1',
      from: '2026-06-10',
      to: '2026-06-11',
    });

    expect(ordersRepositoryMock.findOrdersForSellerShop).toHaveBeenCalledWith({
      requesterUserId: 'seller-1',
      shopId: 'shop-1',
    });
    expect(result).toEqual({
      range: {
        from: '2026-06-10T00:00:00.000Z',
        to: '2026-06-11T23:59:59.999Z',
        days: 2,
      },
      revenue: {
        value: 1200,
        growthPercent: 100,
      },
      orders: {
        value: 2,
        growthPercent: 100,
      },
      offers: {
        value: 4,
        growthPercent: 100,
      },
    });
  });

  it('returns negative growth percentages when the current range is lower than the previous range', async () => {
    ordersRepositoryMock.findOrdersForSellerShop.mockResolvedValueOnce([
      createOrder({
        id: 'current-order',
        createdAt: new Date('2026-06-10T10:00:00.000Z'),
        sellerReceivableAmount: 500,
        items: [createItem({ offerId: 'offer-1', quantity: 1 })],
      }),
      createOrder({
        id: 'previous-order-1',
        createdAt: new Date('2026-06-08T10:00:00.000Z'),
        sellerReceivableAmount: 600,
        items: [createItem({ offerId: 'offer-2', quantity: 2 })],
      }),
      createOrder({
        id: 'previous-order-2',
        createdAt: new Date('2026-06-09T10:00:00.000Z'),
        sellerReceivableAmount: 400,
        items: [createItem({ offerId: 'offer-3', quantity: 2 })],
      }),
    ]);

    const result = await useCase.execute({
      requesterUserId: 'seller-1',
      shopId: 'shop-1',
      from: '2026-06-10',
      to: '2026-06-11',
    });

    expect(result.revenue.growthPercent).toBe(-50);
    expect(result.orders.growthPercent).toBe(-50);
    expect(result.offers.growthPercent).toBe(-75);
  });

  it('uses shop group revenue and items for multi-shop orders', async () => {
    ordersRepositoryMock.findOrdersForSellerShop.mockResolvedValueOnce([
      createOrder({
        id: 'multi-shop-order',
        createdAt: new Date('2026-06-10T10:00:00.000Z'),
        buyerPayableAmount: 4700,
        sellerReceivableAmount: 4000,
        totalAmount: 4700,
        shippingFeeAmount: 700,
        shopGroups: [
          createShopGroup({ id: 'group-shop-1', shopId: 'shop-1', sellerReceivableAmount: 1500, shippingFeeAmount: 200 }),
          createShopGroup({ id: 'group-shop-2', shopId: 'shop-2', sellerReceivableAmount: 2500, shippingFeeAmount: 500 }),
        ],
        items: [
          createItem({ offerId: 'offer-shop-1', quantity: 3, orderShopGroupId: 'group-shop-1', shopId: 'shop-1' }),
          createItem({ offerId: 'offer-shop-2', quantity: 5, orderShopGroupId: 'group-shop-2', shopId: 'shop-2' }),
        ],
      }),
    ]);

    const result = await useCase.execute({
      requesterUserId: 'seller-1',
      shopId: 'shop-1',
      from: '2026-06-10',
      to: '2026-06-10',
    });

    expect(result.revenue.value).toBe(1500);
    expect(result.offers.value).toBe(3);
  });
});

function createOrder(overrides: Record<string, unknown>) {
  return {
    id: 'order-id',
    buyerUserId: 'buyer-1',
    buyerShopId: null,
    shippingPhone: null,
    shippingName: null,
    sellerReceivableAmount: 0,
    buyerPayableAmount: 0,
    totalAmount: 0,
    shippingFeeAmount: 0,
    shopId: 'shop-1',
    shop: { shopName: 'Seller Shop', ownerUserId: 'seller-1' },
    shopGroups: [],
    items: [],
    createdAt: new Date(),
    ...overrides,
  };
}

function createItem(input: { offerId: string; quantity: number; orderShopGroupId?: string; shopId?: string }) {
  return {
    id: `${input.offerId}-item`,
    offerId: input.offerId,
    orderShopGroupId: input.orderShopGroupId ?? null,
    quantity: input.quantity,
    offer: { shop: input.shopId ? { id: input.shopId } : undefined },
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
