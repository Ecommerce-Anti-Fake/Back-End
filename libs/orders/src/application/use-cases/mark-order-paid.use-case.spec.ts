import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { MarkOrderPaidUseCase } from './mark-order-paid.use-case';

describe('MarkOrderPaidUseCase', () => {
  let useCase: MarkOrderPaidUseCase;

  const ordersRepositoryMock = {
    findOrderById: jest.fn(),
    markOrderPaid: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarkOrderPaidUseCase,
        { provide: OrdersRepository, useValue: ordersRepositoryMock },
      ],
    }).compile();

    useCase = module.get<MarkOrderPaidUseCase>(MarkOrderPaidUseCase);
  });

  it('should allow buyer to mark pending order as paid', async () => {
    ordersRepositoryMock.findOrderById.mockResolvedValueOnce(createOrderRecord());
    ordersRepositoryMock.markOrderPaid.mockResolvedValueOnce(
      createOrderRecord({ orderStatus: 'paid', paymentStatus: 'PAID', escrowStatus: 'HELD' }),
    );

    const result = await useCase.execute({
      id: 'order-1',
      requesterUserId: 'buyer-user-1',
      providerRef: 'bank-ref-1',
    });

    expect(ordersRepositoryMock.markOrderPaid).toHaveBeenCalledWith({
      id: 'order-1',
      providerRef: 'bank-ref-1',
    });
    expect(result).toMatchObject({
      id: 'order-1',
      orderStatus: 'paid',
      paymentStatus: 'PAID',
      escrowStatus: 'HELD',
    });
  });
});

function createOrderRecord(overrides?: { orderStatus?: string; paymentStatus?: string; escrowStatus?: string }) {
  return {
    id: 'order-1',
    orderMode: 'RETAIL',
    orderStatus: overrides?.orderStatus ?? 'pending',
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
      paymentStatus: overrides?.paymentStatus ?? 'PENDING',
      amount: new Prisma.Decimal(100),
      providerRef: null,
      createdAt: new Date('2026-04-15T10:00:00.000Z'),
    },
    escrow: {
      id: 'escrow-1',
      orderId: 'order-1',
      escrowStatus: overrides?.escrowStatus ?? 'PENDING',
      heldAmount: new Prisma.Decimal(overrides?.escrowStatus === 'HELD' ? 100 : 0),
      holdAt: overrides?.escrowStatus === 'HELD' ? new Date('2026-04-15T10:05:00.000Z') : null,
      releaseAt: null,
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
