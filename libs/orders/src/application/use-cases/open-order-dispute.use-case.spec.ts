import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { OpenOrderDisputeUseCase } from './open-order-dispute.use-case';

describe('OpenOrderDisputeUseCase', () => {
  let useCase: OpenOrderDisputeUseCase;

  const ordersRepositoryMock = {
    findOrderById: jest.fn(),
    findOpenDisputeByOrder: jest.fn(),
    createDispute: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenOrderDisputeUseCase,
        { provide: OrdersRepository, useValue: ordersRepositoryMock },
      ],
    }).compile();

    useCase = module.get<OpenOrderDisputeUseCase>(OpenOrderDisputeUseCase);
  });

  it('should allow buyer to open dispute on paid order', async () => {
    ordersRepositoryMock.findOrderById.mockResolvedValueOnce(createOrderRecord());
    ordersRepositoryMock.findOpenDisputeByOrder.mockResolvedValueOnce(null);
    ordersRepositoryMock.createDispute.mockResolvedValueOnce({
      id: 'dispute-1',
      orderId: 'order-1',
      openedByUserId: 'buyer-user-1',
      reason: 'Wrong item delivered',
      disputeStatus: 'OPEN',
    });

    const result = await useCase.execute({
      id: 'order-1',
      requesterUserId: 'buyer-user-1',
      reason: 'Wrong item delivered',
    });

    expect(ordersRepositoryMock.createDispute).toHaveBeenCalledWith({
      orderId: 'order-1',
      openedByUserId: 'buyer-user-1',
      reason: 'Wrong item delivered',
    });
    expect(result).toMatchObject({
      id: 'dispute-1',
      disputeStatus: 'OPEN',
    });
  });
});

function createOrderRecord() {
  return {
    id: 'order-1',
    orderMode: 'RETAIL',
    orderStatus: 'paid',
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
    items: [],
  };
}
