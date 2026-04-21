import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { OrderReversalService } from '../services';
import { RefundOrderUseCase } from './refund-order.use-case';

describe('RefundOrderUseCase', () => {
  let useCase: RefundOrderUseCase;

  const ordersRepositoryMock = {
    findOrderById: jest.fn(),
  };
  const orderReversalServiceMock = {
    refundPaidOrder: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefundOrderUseCase,
        { provide: OrdersRepository, useValue: ordersRepositoryMock },
        { provide: OrderReversalService, useValue: orderReversalServiceMock },
      ],
    }).compile();

    useCase = module.get<RefundOrderUseCase>(RefundOrderUseCase);
  });

  it('should allow seller to refund a paid order', async () => {
    ordersRepositoryMock.findOrderById.mockResolvedValueOnce(createOrderRecord());
    orderReversalServiceMock.refundPaidOrder.mockResolvedValueOnce(
      createOrderRecord({ orderStatus: 'refunded', paymentStatus: 'REFUNDED', escrowStatus: 'REFUNDED' }),
    );

    const result = await useCase.execute({
      id: 'order-1',
      requesterUserId: 'seller-user-1',
    });

    expect(orderReversalServiceMock.refundPaidOrder).toHaveBeenCalledWith('order-1');
    expect(result).toMatchObject({
      id: 'order-1',
      orderStatus: 'refunded',
      paymentStatus: 'REFUNDED',
      escrowStatus: 'REFUNDED',
    });
  });
});

function createOrderRecord(overrides?: { orderStatus?: string; paymentStatus?: string; escrowStatus?: string }) {
  return {
    id: 'order-1',
    orderMode: 'WHOLESALE',
    orderStatus: overrides?.orderStatus ?? 'paid',
    shopId: 'seller-shop-1',
    buyerUserId: 'buyer-user-1',
    buyerShopId: 'buyer-shop-1',
    buyerDistributionNodeId: null,
    baseAmount: new Prisma.Decimal(1000),
    discountAmount: new Prisma.Decimal(100),
    platformFeeAmount: new Prisma.Decimal(0),
    buyerPayableAmount: new Prisma.Decimal(900),
    sellerReceivableAmount: new Prisma.Decimal(900),
    totalAmount: new Prisma.Decimal(900),
    createdAt: new Date('2026-04-15T10:00:00.000Z'),
    shop: {
      shopName: 'Seller Shop',
      ownerUserId: 'seller-user-1',
    },
    buyerShop: {
      ownerUserId: 'buyer-user-1',
    },
    paymentIntent: {
      id: 'payment-1',
      orderId: 'order-1',
      paymentMethod: 'manual_confirmation',
      paymentStatus: overrides?.paymentStatus ?? 'PAID',
      amount: new Prisma.Decimal(900),
      providerRef: null,
      createdAt: new Date('2026-04-15T10:00:00.000Z'),
    },
    escrow: {
      id: 'escrow-1',
      orderId: 'order-1',
      escrowStatus: overrides?.escrowStatus ?? 'HELD',
      heldAmount: new Prisma.Decimal(900),
      holdAt: new Date('2026-04-15T10:05:00.000Z'),
      releaseAt: overrides?.escrowStatus === 'REFUNDED' ? new Date('2026-04-15T10:30:00.000Z') : null,
    },
    items: [
      {
        offerId: 'offer-1',
        offerTitleSnapshot: 'Offer 1',
        unitPrice: new Prisma.Decimal(90),
        quantity: 10,
        verificationLevelSnapshot: 'SERIALIZED',
      },
    ],
  };
}
