import { Test, TestingModule } from '@nestjs/testing';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { GetSellerShopDailyMetricsUseCase } from './get-seller-shop-daily-metrics.use-case';

describe('GetSellerShopDailyMetricsUseCase', () => {
  let useCase: GetSellerShopDailyMetricsUseCase;

  const ordersRepositoryMock = {
    findOrdersForSellerShop: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetSellerShopDailyMetricsUseCase,
        { provide: OrdersRepository, useValue: ordersRepositoryMock },
      ],
    }).compile();

    useCase = module.get<GetSellerShopDailyMetricsUseCase>(
      GetSellerShopDailyMetricsUseCase,
    );
  });

  it('returns revenue and order count series for the requested date range', async () => {
    ordersRepositoryMock.findOrdersForSellerShop.mockResolvedValueOnce([
      createOrder({
        id: 'order-1',
        createdAt: new Date('2026-06-10T10:00:00.000Z'),
        sellerReceivableAmount: 800,
      }),
      createOrder({
        id: 'order-2',
        createdAt: new Date('2026-06-10T15:00:00.000Z'),
        sellerReceivableAmount: 400,
      }),
      createOrder({
        id: 'order-3',
        createdAt: new Date('2026-06-11T10:00:00.000Z'),
        sellerReceivableAmount: 600,
      }),
      createOrder({
        id: 'outside-order',
        createdAt: new Date('2026-06-12T10:00:00.000Z'),
        sellerReceivableAmount: 999,
      }),
    ]);

    const result = await useCase.execute({
      requesterUserId: 'seller-1',
      shopId: 'shop-1',
      fromDate: '2026-06-10',
      toDate: '2026-06-11',
    });

    expect(ordersRepositoryMock.findOrdersForSellerShop).toHaveBeenCalledWith({
      requesterUserId: 'seller-1',
      shopId: 'shop-1',
    });
    expect(result).toEqual({
      range: {
        days: 2,
        from: '2026-06-10T00:00:00.000Z',
        to: '2026-06-11T23:59:59.999Z',
      },
      series: [
        {
          date: '2026-06-10',
          label: '10/06',
          revenue: 1200,
          orders: 2,
        },
        {
          date: '2026-06-11',
          label: '11/06',
          revenue: 600,
          orders: 1,
        },
      ],
    });
  });

  it('keeps empty days in the series with zero values', async () => {
    ordersRepositoryMock.findOrdersForSellerShop.mockResolvedValueOnce([
      createOrder({
        id: 'order-1',
        createdAt: new Date('2026-06-12T10:00:00.000Z'),
        sellerReceivableAmount: 500,
      }),
    ]);

    const result = await useCase.execute({
      requesterUserId: 'seller-1',
      shopId: 'shop-1',
      fromDate: '2026-06-10',
      toDate: '2026-06-12',
    });

    expect(result.series).toEqual([
      { date: '2026-06-10', label: '10/06', revenue: 0, orders: 0 },
      { date: '2026-06-11', label: '11/06', revenue: 0, orders: 0 },
      { date: '2026-06-12', label: '12/06', revenue: 500, orders: 1 },
    ]);
  });

  it('uses the matching shop group receivable instead of aggregate order totals', async () => {
    ordersRepositoryMock.findOrdersForSellerShop.mockResolvedValueOnce([
      createOrder({
        id: 'multi-shop-order',
        createdAt: new Date('2026-06-10T10:00:00.000Z'),
        buyerPayableAmount: 3700,
        sellerReceivableAmount: 3000,
        totalAmount: 3700,
        shippingFeeAmount: 700,
        shopGroups: [
          createShopGroup({ id: 'group-shop-1', shopId: 'shop-1', sellerReceivableAmount: 900, shippingFeeAmount: 200 }),
          createShopGroup({ id: 'group-shop-2', shopId: 'shop-2', sellerReceivableAmount: 2100, shippingFeeAmount: 500 }),
        ],
      }),
    ]);

    const result = await useCase.execute({
      requesterUserId: 'seller-1',
      shopId: 'shop-1',
      fromDate: '2026-06-10',
      toDate: '2026-06-10',
    });

    expect(result.series).toEqual([
      { date: '2026-06-10', label: '10/06', revenue: 900, orders: 1 },
    ]);
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
