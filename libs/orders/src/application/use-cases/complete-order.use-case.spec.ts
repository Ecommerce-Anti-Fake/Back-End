import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { CompleteOrderUseCase } from './complete-order.use-case';

describe('CompleteOrderUseCase', () => {
  let useCase: CompleteOrderUseCase;

  const ordersRepositoryMock = {
    findOrderById: jest.fn(),
    completeOrder: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompleteOrderUseCase,
        { provide: OrdersRepository, useValue: ordersRepositoryMock },
      ],
    }).compile();

    useCase = module.get<CompleteOrderUseCase>(CompleteOrderUseCase);
  });

  it('should allow seller to complete a paid order', async () => {
    ordersRepositoryMock.findOrderById.mockResolvedValueOnce(createOrderRecord());
    ordersRepositoryMock.completeOrder.mockResolvedValueOnce(
      createOrderRecord({ orderStatus: 'completed' }),
    );

    const result = await useCase.execute({
      id: 'order-1',
      requesterUserId: 'seller-user-1',
    });

    expect(ordersRepositoryMock.completeOrder).toHaveBeenCalledWith('order-1');
    expect(result).toMatchObject({
      id: 'order-1',
      orderStatus: 'completed',
    });
  });
});

function createOrderRecord(overrides?: { orderStatus?: string }) {
  return {
    id: 'order-1',
    orderMode: 'RETAIL',
    orderStatus: overrides?.orderStatus ?? 'paid',
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
      paymentMethod: 'manual_confirmation',
      paymentStatus: 'PAID',
      amount: new Prisma.Decimal(100),
      providerRef: null,
      createdAt: new Date('2026-04-15T10:00:00.000Z'),
    },
    items: [
      {
        offerId: 'offer-1',
        offerTitleSnapshot: 'Offer 1',
        unitPrice: new Prisma.Decimal(100),
        quantity: 1,
        verificationLevelSnapshot: 'SERIALIZED',
      },
    ],
  };
}
