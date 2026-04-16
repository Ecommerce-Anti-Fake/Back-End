import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { ResolveOrderDisputeUseCase } from './resolve-order-dispute.use-case';

describe('ResolveOrderDisputeUseCase', () => {
  let useCase: ResolveOrderDisputeUseCase;

  const ordersRepositoryMock = {
    findDisputeById: jest.fn(),
    resolveDispute: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResolveOrderDisputeUseCase,
        { provide: OrdersRepository, useValue: ordersRepositoryMock },
      ],
    }).compile();

    useCase = module.get<ResolveOrderDisputeUseCase>(ResolveOrderDisputeUseCase);
  });

  it('should allow seller to resolve an open dispute without refund', async () => {
    ordersRepositoryMock.findDisputeById.mockResolvedValueOnce(createDisputeRecord());
    ordersRepositoryMock.resolveDispute.mockResolvedValueOnce({
      ...createDisputeRecord(),
      disputeStatus: 'RESOLVED',
      resolvedAt: new Date('2026-04-15T11:00:00.000Z'),
    });

    const result = await useCase.execute({
      disputeId: 'dispute-1',
      requesterUserId: 'seller-user-1',
      resolution: 'RESOLVED',
    });

    expect(ordersRepositoryMock.resolveDispute).toHaveBeenCalledWith({
      disputeId: 'dispute-1',
      resolution: 'RESOLVED',
    });
    expect(result).toMatchObject({
      id: 'dispute-1',
      disputeStatus: 'RESOLVED',
    });
  });

  it('should allow seller to refund an open dispute on paid order', async () => {
    ordersRepositoryMock.findDisputeById.mockResolvedValueOnce(createDisputeRecord({ orderStatus: 'paid' }));
    ordersRepositoryMock.resolveDispute.mockResolvedValueOnce({
      ...createDisputeRecord({ orderStatus: 'refunded', paymentStatus: 'REFUNDED' }),
      disputeStatus: 'REFUNDED',
      resolvedAt: new Date('2026-04-15T11:00:00.000Z'),
    });

    const result = await useCase.execute({
      disputeId: 'dispute-1',
      requesterUserId: 'seller-user-1',
      resolution: 'REFUNDED',
    });

    expect(ordersRepositoryMock.resolveDispute).toHaveBeenCalledWith({
      disputeId: 'dispute-1',
      resolution: 'REFUNDED',
    });
    expect(result).toMatchObject({
      disputeStatus: 'REFUNDED',
      order: {
        orderStatus: 'refunded',
      },
    });
  });
});

function createDisputeRecord(overrides?: { orderStatus?: string; paymentStatus?: string }) {
  return {
    id: 'dispute-1',
    orderId: 'order-1',
    openedByUserId: 'buyer-user-1',
    reason: 'Wrong item delivered',
    disputeStatus: 'OPEN',
    openedAt: new Date('2026-04-15T10:00:00.000Z'),
    resolvedAt: null,
    order: {
      id: 'order-1',
      orderMode: 'RETAIL',
      orderStatus: overrides?.orderStatus ?? 'completed',
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
        ownerUserId: 'seller-user-1',
      },
      buyerShop: null,
      paymentIntent: {
        id: 'payment-1',
        orderId: 'order-1',
        paymentMethod: 'manual_confirmation',
        paymentStatus: overrides?.paymentStatus ?? 'PAID',
        amount: new Prisma.Decimal(100),
        providerRef: null,
        createdAt: new Date('2026-04-15T10:00:00.000Z'),
      },
      items: [
        {
          id: 'item-1',
          offerId: 'offer-1',
          offerTitleSnapshot: 'Offer 1',
          unitPrice: new Prisma.Decimal(100),
          quantity: 1,
          verificationLevelSnapshot: 'STANDARD',
        },
      ],
    },
  };
}
