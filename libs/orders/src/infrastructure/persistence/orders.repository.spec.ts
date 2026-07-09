import { OrdersRepository } from './orders.repository';

describe('OrdersRepository', () => {
  it('lists only COD or paid shop orders and filters by the shop fulfillment status', async () => {
    const count = jest.fn();
    const findMany = jest.fn();
    const prisma = {
      shop: { findFirst: jest.fn().mockResolvedValue({ id: 'shop-1' }) },
      order: { count, findMany },
      $transaction: jest.fn().mockResolvedValue([1, []]),
    };
    const repository = new OrdersRepository(prisma as never);

    await repository.findSellerShopOrders({
      requesterUserId: 'seller-1',
      shopId: 'shop-1',
      status: 'PROCESSING',
      page: 1,
      pageSize: 20,
    });

    const expectedWhere = {
      shopGroups: {
        some: {
          shopId: 'shop-1',
          fulfillmentStatus: 'PROCESSING',
        },
      },
      OR: [
        { paymentIntent: { is: { paymentMethod: 'COD' } } },
        { paymentIntent: { is: { paymentMethod: 'PAYOS', paymentStatus: 'PAID' } } },
      ],
    };
    expect(count).toHaveBeenCalledWith({ where: expectedWhere });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expectedWhere }));
  });

  it('counts seller shop orders by the requested dashboard statuses', async () => {
    const count = jest.fn();
    const prisma = {
      shop: {
        findFirst: jest.fn().mockResolvedValue({ id: 'shop-1' }),
      },
      order: { count },
      $transaction: jest.fn().mockResolvedValue([1284, 42, 156, 1086]),
    };
    const repository = new OrdersRepository(prisma as never);

    await expect(
      repository.getSellerShopOrderStatusSummary({
        requesterUserId: 'seller-1',
        shopId: 'shop-1',
      }),
    ).resolves.toEqual({
      totalOrders: 1284,
      pendingOrders: 42,
      shippingOrders: 156,
      completedOrders: 1086,
    });
    expect(prisma.shop.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'shop-1', ownerUserId: 'seller-1' },
      }),
    );
    expect(count).toHaveBeenNthCalledWith(1, {
      where: { shopGroups: { some: { shopId: 'shop-1' } } },
    });
    expect(count).toHaveBeenNthCalledWith(2, {
      where: {
        shopGroups: {
          some: { shopId: 'shop-1', fulfillmentStatus: 'PENDING' },
        },
      },
    });
    expect(count).toHaveBeenNthCalledWith(3, {
      where: {
        shopGroups: {
          some: { shopId: 'shop-1', fulfillmentStatus: 'SHIPPING' },
        },
      },
    });
    expect(count).toHaveBeenNthCalledWith(4, {
      where: {
        shopGroups: { some: { shopId: 'shop-1' } },
        OR: [
          { orderStatus: 'completed' },
          {
            shopGroups: {
              some: { shopId: 'shop-1', fulfillmentStatus: 'DELIVERED' },
            },
          },
        ],
      },
    });
  });

  it('rejects order status summary access for a shop not owned by the requester', async () => {
    const prisma = {
      shop: { findFirst: jest.fn().mockResolvedValue(null) },
      order: { count: jest.fn() },
      $transaction: jest.fn(),
    };
    const repository = new OrdersRepository(prisma as never);

    await expect(
      repository.getSellerShopOrderStatusSummary({
        requesterUserId: 'seller-2',
        shopId: 'shop-1',
      }),
    ).rejects.toThrow('Shop does not belong to current user');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('should lock offer inventory rows before decrementing stock', async () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      offer: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    const prisma = {};

    const repository = new OrdersRepository(prisma as never);

    await repository.lockOfferInventoryRows(tx as never, 'offer-1');
    await repository.decrementOfferAvailableQuantity(tx as never, 'offer-1', 1);

    expect(tx.$queryRaw).toHaveBeenCalledTimes(3);
    expect(tx.offer.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.offer.updateMany.mock.invocationCallOrder[0]);
    expect(tx.$queryRaw.mock.invocationCallOrder[1]).toBeLessThan(tx.offer.updateMany.mock.invocationCallOrder[0]);
    expect(tx.$queryRaw.mock.invocationCallOrder[2]).toBeLessThan(tx.offer.updateMany.mock.invocationCallOrder[0]);
  });

  it('should reject fulfillment allocation when batch stock is insufficient', async () => {
    const tx = {
      order: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'order-1',
          shopId: 'shop-1',
          items: [
            {
              id: 'order-item-1',
              offerId: 'offer-1',
              quantity: 2,
              batchAllocations: [],
              offer: { shopId: 'shop-1' },
            },
          ],
        }),
        update: jest.fn(),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
      offerBatchLink: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      orderItemBatchAllocation: {
        createMany: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback) => callback(tx)),
    };

    const repository = new OrdersRepository(prisma as never);

    await expect(repository.allocateOrderBatchesAndUpdateFulfillment('order-1', 'PROCESSING')).rejects.toThrow(
      'Order item does not have enough batch stock',
    );
    expect(tx.order.update).not.toHaveBeenCalled();
    expect(tx.orderItemBatchAllocation.createMany).not.toHaveBeenCalled();
  });

  it('should not consume batch stock again when order item is already fully allocated', async () => {
    const updatedOrder = {
      id: 'order-1',
      fulfillmentStatus: 'PROCESSING',
    };
    const tx = {
      order: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'order-1',
          shopId: 'shop-1',
          items: [
            {
              id: 'order-item-1',
              offerId: 'offer-1',
              quantity: 2,
              batchAllocations: [{ quantity: 2 }],
            },
          ],
        }),
        update: jest.fn().mockResolvedValue(updatedOrder),
      },
      $queryRaw: jest.fn(),
      offerBatchLink: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
      supplyBatch: {
        update: jest.fn(),
      },
      orderItemBatchAllocation: {
        createMany: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback) => callback(tx)),
    };

    const repository = new OrdersRepository(prisma as never);

    await expect(repository.allocateOrderBatchesAndUpdateFulfillment('order-1', 'PROCESSING')).resolves.toBe(updatedOrder);
    expect(tx.$queryRaw).not.toHaveBeenCalled();
    expect(tx.offerBatchLink.findMany).not.toHaveBeenCalled();
    expect(tx.offerBatchLink.update).not.toHaveBeenCalled();
    expect(tx.supplyBatch.update).not.toHaveBeenCalled();
    expect(tx.orderItemBatchAllocation.createMany).not.toHaveBeenCalled();
    expect(tx.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'order-1' },
        data: { fulfillmentStatus: 'PROCESSING' },
      }),
    );
  });

  it('should sum offer batch allocation quantity for resale checkout validation', async () => {
    const prisma = {
      offerBatchLink: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: {
            allocatedQuantity: 12,
          },
        }),
      },
    };
    const repository = new OrdersRepository(prisma as never);

    await expect(repository.getOfferAllocatedBatchQuantity('offer-1')).resolves.toBe(12);
    expect(prisma.offerBatchLink.aggregate).toHaveBeenCalledWith({
      where: {
        offerId: 'offer-1',
        allocatedQuantity: {
          gt: 0,
        },
      },
      _sum: {
        allocatedQuantity: true,
      },
    });
  });

  it('should aggregate admin finance reconciliation records', async () => {
    const releasedOrder = {
      id: 'order-1',
      shopId: 'shop-1',
      shop: {
        id: 'shop-1',
        shopName: 'Factory Shop',
      },
      paymentIntent: {
        paymentStatus: 'PAID',
      },
      escrow: {
        escrowStatus: 'RELEASED',
        heldAmount: { toString: () => '100' },
      },
      buyerPayableAmount: { toString: () => '100' },
      platformFeeAmount: { toString: () => '20' },
      sellerReceivableAmount: { toString: () => '80' },
      affiliateConversion: {
        commissionEntries: [
          { commissionStatus: 'LOCKED', amount: { toString: () => '5' } },
          { commissionStatus: 'PAID', amount: { toString: () => '3' } },
        ],
      },
      createdAt: new Date('2026-05-21T10:00:00.000Z'),
    };
    const refundedOrder = {
      id: 'order-2',
      shopId: 'shop-1',
      shop: {
        id: 'shop-1',
        shopName: 'Factory Shop',
      },
      paymentIntent: {
        paymentStatus: 'REFUNDED',
      },
      escrow: {
        escrowStatus: 'REFUNDED',
        heldAmount: { toString: () => '50' },
      },
      buyerPayableAmount: { toString: () => '50' },
      platformFeeAmount: { toString: () => '10' },
      sellerReceivableAmount: { toString: () => '40' },
      affiliateConversion: null,
      createdAt: new Date('2026-05-22T10:00:00.000Z'),
    };
    const prisma = {
      $transaction: jest.fn().mockResolvedValue([2, [releasedOrder, refundedOrder], [releasedOrder]]),
      order: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
    };
    const repository = new OrdersRepository(prisma as never);

    const result = await repository.findAdminFinanceReconciliation({
      shopId: 'shop-1',
      paymentStatus: 'PAID',
      page: 1,
      pageSize: 1,
    });

    expect(prisma.order.count).toHaveBeenCalledWith({
      where: {
        shopId: 'shop-1',
        paymentIntent: {
          is: {
            paymentStatus: 'PAID',
          },
        },
      },
    });
    expect(result.summary).toMatchObject({
      orderCount: 2,
      buyerPayableTotal: 150,
      platformFeeTotal: 30,
      sellerReceivableTotal: 120,
      sellerPayoutReadyTotal: 80,
      refundTotal: 50,
      affiliatePendingLiabilityTotal: 5,
      affiliatePaidTotal: 3,
    });
    expect(result.items).toMatchObject([
      {
        orderId: 'order-1',
        payoutStatus: 'READY_FOR_PAYOUT',
        sellerPayoutReadyAmount: 80,
      },
    ]);
  });

  it('should consume the resale offer attached batch during fulfillment allocation', async () => {
    const updatedOrder = {
      id: 'order-1',
      fulfillmentStatus: 'PROCESSING',
    };
    const tx = {
      order: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'order-1',
          shopId: 'l1-shop',
          items: [
            {
              id: 'order-item-1',
              offerId: 'resale-offer-1',
              quantity: 3,
              batchAllocations: [],
              offer: { shopId: 'l1-shop' },
            },
          ],
        }),
        update: jest.fn().mockResolvedValue(updatedOrder),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
      offerBatchLink: {
        findMany: jest.fn().mockResolvedValue([
          {
            offerId: 'resale-offer-1',
            batchId: 'received-batch-1',
            allocatedQuantity: 5,
            createdAt: new Date('2026-05-19T00:00:00.000Z'),
          },
        ]),
        update: jest.fn(),
      },
      supplyBatch: {
        update: jest.fn(),
      },
      orderItemBatchAllocation: {
        createMany: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const repository = new OrdersRepository(prisma as never);

    await expect(repository.allocateOrderBatchesAndUpdateFulfillment('order-1', 'PROCESSING')).resolves.toBe(updatedOrder);

    expect(tx.offerBatchLink.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          offerId: 'resale-offer-1',
          batch: {
            shopId: 'l1-shop',
          },
        }),
      }),
    );
    expect(tx.offerBatchLink.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          offerId_batchId: {
            offerId: 'resale-offer-1',
            batchId: 'received-batch-1',
          },
        },
        data: {
          allocatedQuantity: {
            decrement: 3,
          },
        },
      }),
    );
    expect(tx.supplyBatch.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'received-batch-1' },
        data: {
          quantity: {
            decrement: 3,
          },
        },
      }),
    );
    expect(tx.orderItemBatchAllocation.createMany).toHaveBeenCalledWith({
      data: [
        {
          orderItemId: 'order-item-1',
          batchId: 'received-batch-1',
          quantity: 3,
        },
      ],
    });
  });

  it('allocates a shop group from batches owned by that group shop instead of the legacy order shop', async () => {
    const updatedOrder = { id: 'order-1', fulfillmentStatus: 'PROCESSING' };
    const tx = {
      orderShopGroup: {
        findUnique: jest.fn().mockResolvedValue({ id: 'group-2', orderId: 'order-1', shopId: 'shop-2' }),
        update: jest.fn(),
        findMany: jest.fn().mockResolvedValue([
          { fulfillmentStatus: 'PENDING' },
          { fulfillmentStatus: 'PROCESSING' },
        ]),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
      offerBatchLink: {
        findMany: jest.fn().mockResolvedValue([
          { offerId: 'offer-2', batchId: 'batch-2', allocatedQuantity: 1, createdAt: new Date() },
        ]),
        update: jest.fn(),
      },
      supplyBatch: { update: jest.fn() },
      orderItemBatchAllocation: { createMany: jest.fn() },
      order: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({
            id: 'order-1',
            items: [
              {
                id: 'item-2',
                offerId: 'offer-2',
                quantity: 1,
                batchAllocations: [],
                offer: { shopId: 'shop-2' },
              },
            ],
          }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(updatedOrder),
        update: jest.fn(),
      },
    };
    const repository = new OrdersRepository({ $transaction: jest.fn((callback) => callback(tx)) } as never);

    await repository.allocateOrderBatchesAndUpdateFulfillment('order-1', 'PROCESSING', 'group-2');

    expect(tx.offerBatchLink.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          offerId: 'offer-2',
          batch: { shopId: 'shop-2' },
        }),
      }),
    );
  });

  it('rejects fulfillment allocation when the requested shop group does not exist', async () => {
    const tx = {
      orderShopGroup: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const repository = new OrdersRepository({ $transaction: jest.fn((callback) => callback(tx)) } as never);

    await expect(
      repository.allocateOrderBatchesAndUpdateFulfillment('order-1', 'PROCESSING', 'missing-group'),
    ).rejects.toThrow('Order shop group not found');
  });

  it('should create payment audit row when cancelling or refunding payment status', async () => {
    const tx = {
      paymentIntent: {
        findUnique: jest.fn().mockResolvedValue({
          paymentMethod: 'PAYOS',
          paymentStatus: 'PAID',
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    };
    const repository = new OrdersRepository({} as never);

    await repository.updatePaymentStatusWithAudit(tx as never, {
      orderId: 'order-1',
      actorUserId: 'seller-user-1',
      paymentStatus: 'REFUNDED',
    });

    expect(tx.paymentIntent.update).toHaveBeenCalledWith({
      where: { orderId: 'order-1' },
      data: { paymentStatus: 'REFUNDED' },
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        targetType: 'ORDER',
        targetId: 'order-1',
        actorUserId: 'seller-user-1',
        action: 'PAYMENT_STATUS_CHANGED',
        fromStatus: 'PAID',
        toStatus: 'REFUNDED',
        note: 'Payment moved from PAID to REFUNDED',
        metadata: {
          domain: 'PAYMENT',
          paymentMethod: 'PAYOS',
        },
      },
    });
  });

  it('resolves every shop group as an order risk target instead of the legacy order shop', async () => {
    const prisma = {
      order: {
        findUnique: jest.fn().mockResolvedValue({
          shopGroups: [{ shopId: 'shop-1' }, { shopId: 'shop-2' }],
          items: [],
        }),
      },
    };
    const repository = new OrdersRepository(prisma as never);

    await expect(
      repository.resolveRiskTargetsForReport({ targetType: 'ORDER', targetId: 'order-1' }),
    ).resolves.toEqual([
      { targetType: 'SHOP', targetId: 'shop-1' },
      { targetType: 'SHOP', targetId: 'shop-2' },
    ]);
  });
});
