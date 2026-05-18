import { OrdersRepository } from './orders.repository';

describe('OrdersRepository', () => {
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

    await expect(repository.allocateOrderBatchesAndUpdateFulfillment('order-1', 'PROCESSING')).resolves.toBe(
      updatedOrder,
    );
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
});
