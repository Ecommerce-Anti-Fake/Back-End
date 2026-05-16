import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { GetOrderFulfillmentAuditUseCase } from './get-order-fulfillment-audit.use-case';

describe('GetOrderFulfillmentAuditUseCase', () => {
  let useCase: GetOrderFulfillmentAuditUseCase;

  const ordersRepositoryMock = {
    findOrderById: jest.fn(),
    findAuditLogsByTarget: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetOrderFulfillmentAuditUseCase,
        { provide: OrdersRepository, useValue: ordersRepositoryMock },
      ],
    }).compile();

    useCase = module.get<GetOrderFulfillmentAuditUseCase>(GetOrderFulfillmentAuditUseCase);
  });

  it('returns fulfillment audit entries for an order participant', async () => {
    ordersRepositoryMock.findOrderById.mockResolvedValueOnce(createOrderRecord());
    ordersRepositoryMock.findAuditLogsByTarget.mockResolvedValueOnce([
      {
        id: 'audit-1',
        action: 'FULFILLMENT_STATUS_CHANGED',
        fromStatus: 'PENDING',
        toStatus: 'PROCESSING',
        note: 'Fulfillment moved from PENDING to PROCESSING',
        actorUserId: 'seller-user-1',
        createdAt: new Date('2026-05-15T10:00:00.000Z'),
        actor: {
          id: 'seller-user-1',
          displayName: 'Seller',
          email: 'seller@example.com',
        },
      },
      {
        id: 'audit-2',
        action: 'PAYMENT_STATUS_CHANGED',
        fromStatus: 'PENDING',
        toStatus: 'PAID',
        note: 'Payment moved from PENDING to PAID',
        actorUserId: 'buyer-user-1',
        createdAt: new Date('2026-05-15T11:00:00.000Z'),
        actor: {
          id: 'buyer-user-1',
          displayName: 'Buyer',
          email: 'buyer@example.com',
        },
      },
    ]);

    const result = await useCase.execute('order-1', 'seller-user-1');

    expect(ordersRepositoryMock.findAuditLogsByTarget).toHaveBeenCalledWith('ORDER', 'order-1');
    expect(result).toEqual([
      {
        id: 'audit-1',
        action: 'FULFILLMENT_STATUS_CHANGED',
        fromStatus: 'PENDING',
        toStatus: 'PROCESSING',
        actorUserId: 'seller-user-1',
        actorDisplayName: 'Seller',
        actorEmail: 'seller@example.com',
        note: 'Fulfillment moved from PENDING to PROCESSING',
        createdAt: new Date('2026-05-15T10:00:00.000Z'),
      },
      {
        id: 'audit-2',
        action: 'PAYMENT_STATUS_CHANGED',
        fromStatus: 'PENDING',
        toStatus: 'PAID',
        actorUserId: 'buyer-user-1',
        actorDisplayName: 'Buyer',
        actorEmail: 'buyer@example.com',
        note: 'Payment moved from PENDING to PAID',
        createdAt: new Date('2026-05-15T11:00:00.000Z'),
      },
    ]);
  });

  it('rejects users outside the order', async () => {
    ordersRepositoryMock.findOrderById.mockResolvedValueOnce(createOrderRecord());

    await expect(useCase.execute('order-1', 'other-user')).rejects.toBeInstanceOf(ForbiddenException);

    expect(ordersRepositoryMock.findAuditLogsByTarget).not.toHaveBeenCalled();
  });

  it('returns sanitized audit entries for the buyer', async () => {
    ordersRepositoryMock.findOrderById.mockResolvedValueOnce(createOrderRecord());
    ordersRepositoryMock.findAuditLogsByTarget.mockResolvedValueOnce([
      createAuditLog({
        actorUserId: 'seller-user-1',
        actor: {
          id: 'seller-user-1',
          displayName: 'Seller',
          email: 'seller@example.com',
        },
      }),
    ]);

    const result = await useCase.execute('order-1', 'buyer-user-1');

    expect(result[0]).toMatchObject({
      actorUserId: null,
      actorDisplayName: 'Seller',
      actorEmail: null,
    });
  });

  it('allows admins to read full audit entries', async () => {
    ordersRepositoryMock.findOrderById.mockResolvedValueOnce(createOrderRecord());
    ordersRepositoryMock.findAuditLogsByTarget.mockResolvedValueOnce([
      createAuditLog({
        actorUserId: 'seller-user-1',
        actor: {
          id: 'seller-user-1',
          displayName: 'Seller',
          email: 'seller@example.com',
        },
      }),
    ]);

    const result = await useCase.execute('order-1', 'admin-user-1', 'admin');

    expect(result[0]).toMatchObject({
      actorUserId: 'seller-user-1',
      actorDisplayName: 'Seller',
      actorEmail: 'seller@example.com',
    });
  });
});

function createAuditLog(overrides: Record<string, unknown> = {}) {
  return {
    id: 'audit-1',
    action: 'FULFILLMENT_STATUS_CHANGED',
    fromStatus: 'PENDING',
    toStatus: 'PROCESSING',
    note: 'Fulfillment moved from PENDING to PROCESSING',
    actorUserId: 'seller-user-1',
    createdAt: new Date('2026-05-15T10:00:00.000Z'),
    actor: {
      id: 'seller-user-1',
      displayName: 'Seller',
      email: 'seller@example.com',
    },
    ...overrides,
  };
}

function createOrderRecord() {
  return {
    id: 'order-1',
    orderMode: 'RETAIL',
    orderStatus: 'paid',
    fulfillmentStatus: 'PENDING',
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
    paymentIntent: null,
    escrow: null,
    disputes: [],
    items: [],
  };
}
