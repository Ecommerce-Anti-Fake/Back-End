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
    items: [],
    createdAt: new Date(),
    ...overrides,
  };
}

function createItem(input: { offerId: string; quantity: number }) {
  return {
    id: `${input.offerId}-item`,
    offerId: input.offerId,
    quantity: input.quantity,
  };
}
