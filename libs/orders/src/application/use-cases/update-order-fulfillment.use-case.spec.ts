import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { OrderReversalService } from '../services';
import { UpdateOrderFulfillmentUseCase } from './update-order-fulfillment.use-case';

describe('UpdateOrderFulfillmentUseCase', () => {
  let useCase: UpdateOrderFulfillmentUseCase;

  const ordersRepositoryMock = {
    findOrderById: jest.fn(),
    allocateOrderBatchesAndUpdateFulfillment: jest.fn(),
    markOrderPaid: jest.fn(),
    updateFulfillmentStatus: jest.fn(),
    updateShopGroupFulfillmentStatus: jest.fn(),
    createAuditLog: jest.fn(),
    createNotification: jest.fn(),
  };
  const orderReversalServiceMock = {
    cancelOrder: jest.fn(),
    cancelOrderShopGroup: jest.fn(),
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
    ordersRepositoryMock.updateFulfillmentStatus.mockResolvedValueOnce(
      createOrderRecord({ fulfillmentStatus: 'PROCESSING' }),
    );

    const result = await useCase.execute({
      id: 'order-1',
      requesterUserId: 'seller-user-1',
      fulfillmentStatus: 'PROCESSING',
    });

    expect(ordersRepositoryMock.updateFulfillmentStatus).toHaveBeenCalledWith('order-1', 'PROCESSING');
    expect(ordersRepositoryMock.allocateOrderBatchesAndUpdateFulfillment).not.toHaveBeenCalled();
    expect(ordersRepositoryMock.createAuditLog).toHaveBeenCalledWith({
      targetType: 'ORDER',
      targetId: 'order-1',
      actorUserId: 'seller-user-1',
      action: 'FULFILLMENT_STATUS_CHANGED',
      fromStatus: 'PENDING',
      toStatus: 'PROCESSING',
      note: 'Fulfillment moved from PENDING to PROCESSING',
      metadata: {
        domain: 'FULFILLMENT',
      },
    });
    expect(ordersRepositoryMock.createNotification).toHaveBeenCalledWith({
      userId: 'buyer-user-1',
      notificationType: 'ORDER_FULFILLMENT',
      title: 'Cap nhat don hang',
      body: 'Don hang order-1 da chuyen sang PROCESSING.',
      targetType: 'ORDER',
      targetId: 'order-1',
      dedupeKey: 'ORDER_FULFILLMENT:order-1:PROCESSING:buyer-user-1',
    });
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

  it('updates only the seller shop group in a multi-shop order', async () => {
    const order = {
      ...createOrderRecord(),
      shopGroups: [
        {
          id: 'group-1',
          fulfillmentStatus: 'PENDING',
          shop: { ownerUserId: 'seller-user-1' },
        },
        {
          id: 'group-2',
          fulfillmentStatus: 'PENDING',
          shop: { ownerUserId: 'seller-user-2' },
        },
      ],
    };
    ordersRepositoryMock.findOrderById.mockResolvedValueOnce(order);
    ordersRepositoryMock.updateShopGroupFulfillmentStatus.mockResolvedValueOnce(order);

    await useCase.execute({
      id: 'order-1',
      requesterUserId: 'seller-user-2',
      fulfillmentStatus: 'PROCESSING',
    });

    expect(ordersRepositoryMock.updateShopGroupFulfillmentStatus).toHaveBeenCalledWith({
      orderId: 'order-1',
      groupId: 'group-2',
      fulfillmentStatus: 'PROCESSING',
    });
    expect(ordersRepositoryMock.allocateOrderBatchesAndUpdateFulfillment).not.toHaveBeenCalled();
  });

  it('marks delivered without completing the order', async () => {
    ordersRepositoryMock.findOrderById.mockResolvedValueOnce(createOrderRecord({ fulfillmentStatus: 'SHIPPING' }));
    ordersRepositoryMock.updateFulfillmentStatus.mockResolvedValueOnce(
      createOrderRecord({ fulfillmentStatus: 'DELIVERED' }),
    );

    const result = await useCase.execute({
      id: 'order-1',
      requesterUserId: 'seller-user-1',
      fulfillmentStatus: 'DELIVERED',
    });

    expect(ordersRepositoryMock.updateFulfillmentStatus).toHaveBeenCalledWith('order-1', 'DELIVERED');
    expect(ordersRepositoryMock.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        targetType: 'ORDER',
        targetId: 'order-1',
        actorUserId: 'seller-user-1',
        fromStatus: 'SHIPPING',
        toStatus: 'DELIVERED',
      }),
    );
    expect(result).toMatchObject({
      orderStatus: 'paid',
      fulfillmentStatus: 'DELIVERED',
    });
  });

  it('passes seller actor when cancelling through fulfillment', async () => {
    ordersRepositoryMock.findOrderById.mockResolvedValueOnce(
      createOrderRecord({ orderStatus: 'pending', paymentStatus: 'PENDING' }),
    );
    orderReversalServiceMock.cancelOrder.mockResolvedValueOnce(
      createOrderRecord({
        orderStatus: 'cancelled',
        fulfillmentStatus: 'CANCELLED',
        paymentStatus: 'CANCELLED',
      }),
    );

    await useCase.execute({
      id: 'order-1',
      requesterUserId: 'seller-user-1',
      fulfillmentStatus: 'CANCELLED',
    });

    expect(orderReversalServiceMock.cancelOrder).toHaveBeenCalledWith('order-1', 'seller-user-1');
  });

  it('cancels only the seller shop group in a multi-shop order', async () => {
    const order = createMultiShopOrder();
    orderReversalServiceMock.cancelOrderShopGroup.mockResolvedValueOnce({
      ...order,
      shopGroups: [order.shopGroups[0], { ...order.shopGroups[1], fulfillmentStatus: 'CANCELLED' }],
    });
    ordersRepositoryMock.findOrderById.mockResolvedValueOnce(order);

    await useCase.execute({
      id: 'order-1',
      requesterUserId: 'seller-user-2',
      fulfillmentStatus: 'CANCELLED',
    });

    expect(orderReversalServiceMock.cancelOrderShopGroup).toHaveBeenCalledWith('order-1', 'group-2');
    expect(orderReversalServiceMock.cancelOrder).not.toHaveBeenCalled();
    expect(ordersRepositoryMock.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        targetId: 'order-1',
        actorUserId: 'seller-user-2',
        fromStatus: 'PENDING',
        toStatus: 'CANCELLED',
        metadata: {
          domain: 'FULFILLMENT',
          orderShopGroupId: 'group-2',
        },
      }),
    );
    expect(ordersRepositoryMock.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        dedupeKey: 'ORDER_FULFILLMENT:order-1:group-2:CANCELLED:buyer-user-1',
      }),
    );
  });

  it('rejects cancellation when the seller does not own an order shop group', async () => {
    ordersRepositoryMock.findOrderById.mockResolvedValueOnce(createMultiShopOrder());

    await expect(
      useCase.execute({
        id: 'order-1',
        requesterUserId: 'other-seller',
        fulfillmentStatus: 'CANCELLED',
      }),
    ).rejects.toThrow('Only the seller can update fulfillment');

    expect(orderReversalServiceMock.cancelOrderShopGroup).not.toHaveBeenCalled();
  });

  it('rejects cancellation when the seller shop group is no longer pending', async () => {
    const order = createMultiShopOrder();
    order.shopGroups[1].fulfillmentStatus = 'PROCESSING';
    ordersRepositoryMock.findOrderById.mockResolvedValueOnce(order);

    await expect(
      useCase.execute({
        id: 'order-1',
        requesterUserId: 'seller-user-2',
        fulfillmentStatus: 'CANCELLED',
      }),
    ).rejects.toThrow('Only pending shop groups can be cancelled by fulfillment');

    expect(orderReversalServiceMock.cancelOrderShopGroup).not.toHaveBeenCalled();
  });
});

function createMultiShopOrder() {
  return {
    ...createOrderRecord(),
    shopGroups: [
      {
        id: 'group-1',
        shopId: 'seller-shop-1',
        fulfillmentStatus: 'PENDING',
        shop: { ownerUserId: 'seller-user-1' },
      },
      {
        id: 'group-2',
        shopId: 'seller-shop-2',
        fulfillmentStatus: 'PENDING',
        shop: { ownerUserId: 'seller-user-2' },
      },
    ],
  };
}

function createOrderRecord(overrides?: { orderStatus?: string; fulfillmentStatus?: string; paymentStatus?: string }) {
  return {
    id: 'order-1',
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
        batchAllocations: [],
        reviews: [],
        offer: {
          media: [],
        },
      },
    ],
  };
}
