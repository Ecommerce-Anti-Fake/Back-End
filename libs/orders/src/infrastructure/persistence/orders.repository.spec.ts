import { Prisma } from '@prisma/client';
import { OrdersRepository } from './orders.repository';

describe('OrdersRepository', () => {
  it('should lock offer inventory rows before decrementing stock', async () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      offer: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      offerBatchLink: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      order: {
        create: jest.fn().mockResolvedValue({
          id: 'order-1',
          orderMode: 'RETAIL',
          orderStatus: 'pending',
          shopId: 'shop-1',
          buyerUserId: 'buyer-1',
          buyerShopId: null,
          buyerDistributionNodeId: null,
          baseAmount: new Prisma.Decimal(100),
          discountAmount: new Prisma.Decimal(0),
          platformFeeAmount: new Prisma.Decimal(20),
          buyerPayableAmount: new Prisma.Decimal(100),
          sellerReceivableAmount: new Prisma.Decimal(80),
          totalAmount: new Prisma.Decimal(100),
          createdAt: new Date('2026-04-17T09:00:00.000Z'),
          shop: {
            shopName: 'Shop 1',
            ownerUserId: 'seller-1',
          },
          buyerShop: null,
          paymentIntent: {
            id: 'payment-1',
            orderId: 'order-1',
            paymentMethod: 'manual_confirmation',
            paymentStatus: 'PENDING',
            amount: new Prisma.Decimal(100),
            providerRef: null,
            createdAt: new Date('2026-04-17T09:00:00.000Z'),
          },
          items: [
            {
              id: 'item-1',
              orderId: 'order-1',
              offerId: 'offer-1',
              offerTitleSnapshot: 'Offer 1',
              unitPrice: new Prisma.Decimal(100),
              quantity: 1,
              verificationLevelSnapshot: 'SERIALIZED',
              batchAllocations: [],
            },
          ],
        }),
      },
    };

    const prisma = {
      $transaction: jest.fn().mockImplementation(async (callback: (client: typeof tx) => unknown) => callback(tx)),
    };

    const repository = new OrdersRepository(prisma as never);

    await repository.createOrder({
      buyerUserId: 'buyer-1',
      buyerShopId: null,
      buyerDistributionNodeId: null,
      shopId: 'shop-1',
      orderMode: 'RETAIL',
      orderType: 'retail_purchase',
      orderStatus: 'pending',
      baseAmount: 100,
      discountAmount: 0,
      platformFeeAmount: 20,
      buyerPayableAmount: 100,
      sellerReceivableAmount: 80,
      totalAmount: 100,
      item: {
        offerId: 'offer-1',
        offerTitleSnapshot: 'Offer 1',
        unitPrice: 100,
        quantity: 1,
        verificationLevelSnapshot: 'SERIALIZED',
      },
    });

    expect(tx.$queryRaw).toHaveBeenCalledTimes(3);
    expect(tx.offer.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.offer.updateMany.mock.invocationCallOrder[0]);
    expect(tx.$queryRaw.mock.invocationCallOrder[1]).toBeLessThan(tx.offer.updateMany.mock.invocationCallOrder[0]);
    expect(tx.$queryRaw.mock.invocationCallOrder[2]).toBeLessThan(tx.offer.updateMany.mock.invocationCallOrder[0]);
  });
});
