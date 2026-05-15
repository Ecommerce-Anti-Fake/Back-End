import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { OrderReversalService } from '../services';
import { UpdateOrderFulfillmentUseCase } from './update-order-fulfillment.use-case';

describe('UpdateOrderFulfillmentUseCase', () => {
  let useCase: UpdateOrderFulfillmentUseCase;

  const ordersRepositoryMock = {
    findOrderById: jest.fn(),
    markOrderPaid: jest.fn(),
    updateFulfillmentStatus: jest.fn(),
  };
  const orderReversalServiceMock = {
    cancelOrder: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateOrderFulfillmentUseCase,
        { provide: OrdersRepository, useValue: ordersRepositoryMock },
        { provide: OrderReversalService, useValue: orderReversalServiceMock },
      ],
    }).compile();

    useCase = module.get<UpdateOrderFulfillmentUseCase>(UpdateOrderFulfillmentUseCase);
  });

  it('starts processing only after payment is ready', async () => {
    ordersRepositoryMock.findOrderById.mockResolvedValueOnce(createOrderRecord());
    ordersRepositoryMock.updateFulfillmentStatus.mockResolvedValueOnce(createOrderRecord({ fulfillmentStatus: 'PROCESSING' }));

    const result = await useCase.execute({
      id: 'order-1',
      requesterUserId: 'seller-user-1',
      fulfillmentStatus: 'PROCESSING',
    });

    expect(ordersRepositoryMock.updateFulfillmentStatus).toHaveBeenCalledWith('order-1', 'PROCESSING');
    expect(result.fulfillmentStatus).toBe('PROCESSING');
  });

  it('prevents skipping directly from pending to shipping', async () => {
    ordersRepositoryMock.findOrderById.mockResolvedValueOnce(createOrderRecord());

    await expect(
      useCase.execute({
        id: 'order-1',
        requesterUserId: 'seller-user-1',
        fulfillmentStatus: 'SHIPPING',
      }),
    ).rejects.toThrow('Order must be processing before shipping');

    expect(ordersRepositoryMock.updateFulfillmentStatus).not.toHaveBeenCalled();
  });

  it('marks delivered without completing the order', async () => {
    ordersRepositoryMock.findOrderById.mockResolvedValueOnce(createOrderRecord({ fulfillmentStatus: 'SHIPPING' }));
    ordersRepositoryMock.updateFulfillmentStatus.mockResolvedValueOnce(createOrderRecord({ fulfillmentStatus: 'DELIVERED' }));

    const result = await useCase.execute({
      id: 'order-1',
      requesterUserId: 'seller-user-1',
      fulfillmentStatus: 'DELIVERED',
    });

    expect(ordersRepositoryMock.updateFulfillmentStatus).toHaveBeenCalledWith('order-1', 'DELIVERED');
    expect(result).toMatchObject({
      orderStatus: 'paid',
      fulfillmentStatus: 'DELIVERED',
    });
  });
});

function createOrderRecord(overrides?: { orderStatus?: string; fulfillmentStatus?: string; paymentStatus?: string }) {
  return {
    id: 'order-1',
    orderMode: 'RETAIL',
    orderStatus: overrides?.orderStatus ?? 'paid',
    fulfillmentStatus: overrides?.fulfillmentStatus ?? 'PENDING',
    shopId: 'seller-shop-1',
    buyerUserId: 'buyer-user-1',
    buyerShopId: null,
    buyerDistributionNodeId: null,
    baseAmount: new Prisma.Decimal(100),
    discountAmount: new Prisma.Decimal(0),
    platformFeeAmount: new Prisma.Decimal(20),
    buyerPayableAmount: new Prisma.Decimal(100),
    sellerReceivableAmount: new Prisma.Decimal(80),
    totalAmount: new Prisma.Decimal(100),
    createdAt: new Date('2026-04-15T10:00:00.000Z'),
    shop: {
      shopName: 'Seller Shop',
      ownerUserId: 'seller-user-1',
    },
    buyerShop: null,
    paymentIntent: {
      id: 'payment-1',
      orderId: 'order-1',
      paymentMethod: 'PAYOS',
      paymentStatus: overrides?.paymentStatus ?? 'PAID',
      amount: new Prisma.Decimal(100),
      providerRef: null,
      createdAt: new Date('2026-04-15T10:00:00.000Z'),
    },
    escrow: null,
    disputes: [],
    items: [
      {
        id: 'order-item-1',
        offerId: 'offer-1',
        offerTitleSnapshot: 'Offer 1',
        unitPrice: new Prisma.Decimal(100),
        quantity: 1,
        verificationLevelSnapshot: 'SERIALIZED',
        batchAllocations: [],
        reviews: [],
        offer: {
          media: [],
        },
      },
    ],
  };
}
