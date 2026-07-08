import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { ReceiveWholesaleOrderInventoryUseCase } from './receive-wholesale-order-inventory.use-case';

describe('ReceiveWholesaleOrderInventoryUseCase', () => {
  let useCase: ReceiveWholesaleOrderInventoryUseCase;

  const ordersRepositoryMock = {
    findOrderById: jest.fn(),
    receiveWholesaleOrderIntoInventory: jest.fn(),
    createAuditLog: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceiveWholesaleOrderInventoryUseCase,
        { provide: OrdersRepository, useValue: ordersRepositoryMock },
      ],
    }).compile();

    useCase = module.get<ReceiveWholesaleOrderInventoryUseCase>(ReceiveWholesaleOrderInventoryUseCase);
  });

  it('creates downstream supply batches for the wholesale buyer after delivery', async () => {
    ordersRepositoryMock.findOrderById.mockResolvedValueOnce(createWholesaleOrder());
    ordersRepositoryMock.receiveWholesaleOrderIntoInventory.mockResolvedValueOnce([
      createBatchReceipt({ batchNumber: 'WHOLESALE-ORDER-1-ITEM-1' }),
    ]);

    const result = await useCase.execute({
      id: 'order-1',
      requesterUserId: 'buyer-user-1',
    });

    expect(ordersRepositoryMock.receiveWholesaleOrderIntoInventory).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'order-1',
        buyerShopId: 'buyer-shop-1',
        buyerDistributionNodeId: 'buyer-node-1',
      }),
    );
    expect(ordersRepositoryMock.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        targetType: 'ORDER',
        targetId: 'order-1',
        actorUserId: 'buyer-user-1',
        action: 'WHOLESALE_INVENTORY_RECEIVED',
      }),
    );
    expect(result).toMatchObject({
      orderId: 'order-1',
      received: true,
      batches: [
        {
          batchNumber: 'WHOLESALE-ORDER-1-ITEM-1',
          quantity: 10,
          sourceOrderId: 'order-1',
          sourceOrderItemId: 'item-1',
        },
      ],
    });
  });

  it('rejects receiving before delivery', async () => {
    ordersRepositoryMock.findOrderById.mockResolvedValueOnce(createWholesaleOrder({ fulfillmentStatus: 'SHIPPING' }));

    await expect(
      useCase.execute({
        id: 'order-1',
        requesterUserId: 'buyer-user-1',
      }),
    ).rejects.toThrow('Only delivered wholesale orders can be received into inventory');

    expect(ordersRepositoryMock.receiveWholesaleOrderIntoInventory).not.toHaveBeenCalled();
  });

  it('rejects non buyer shop owners', async () => {
    ordersRepositoryMock.findOrderById.mockResolvedValueOnce(createWholesaleOrder());

    await expect(
      useCase.execute({
        id: 'order-1',
        requesterUserId: 'other-user',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

function createWholesaleOrder(overrides?: { fulfillmentStatus?: string }) {
  return {
    id: 'order-1',
    orderStatus: 'paid',
    fulfillmentStatus: overrides?.fulfillmentStatus ?? 'DELIVERED',
    shopId: 'seller-shop-1',
    buyerUserId: null,
    buyerShopId: 'buyer-shop-1',
    buyerDistributionNodeId: 'buyer-node-1',
    baseAmount: new Prisma.Decimal(1000),
    discountAmount: new Prisma.Decimal(100),
    platformFeeAmount: new Prisma.Decimal(100),
    buyerPayableAmount: new Prisma.Decimal(900),
    sellerReceivableAmount: new Prisma.Decimal(800),
    totalAmount: new Prisma.Decimal(900),
    shippingName: null,
    shippingPhone: null,
    shippingAddress: null,
    createdAt: new Date('2026-05-18T10:00:00.000Z'),
    shop: {
      shopName: 'Seller Shop',
      ownerUserId: 'seller-user-1',
    },
    buyerShop: {
      ownerUserId: 'buyer-user-1',
    },
    paymentIntent: {
      paymentStatus: 'PAID',
      paymentMethod: 'manual_confirmation',
      providerRef: null,
      createdAt: new Date('2026-05-18T10:00:00.000Z'),
    },
    escrow: null,
    disputes: [],
    items: [
      {
        id: 'item-1',
        offerId: 'offer-1',
        offerTitleSnapshot: 'Wholesale offer',
        unitPrice: new Prisma.Decimal(90),
        quantity: 10,
        batchAllocations: [],
        reviews: [],
        offer: {
          id: 'offer-1',
          productModelId: 'model-1',
          media: [],
        },
      },
    ],
  };
}

function createBatchReceipt(overrides?: Partial<any>) {
  return {
    id: 'batch-1',
    shopId: 'buyer-shop-1',
    productModelId: 'model-1',
    distributionNodeId: 'buyer-node-1',
    batchNumber: 'WHOLESALE-ORDER-1-ITEM-1',
    quantity: 10,
    sourceName: 'Seller Shop',
    countryOfOrigin: 'UNKNOWN',
    sourceType: 'WHOLESALE_ORDER',
    sourceOrderId: 'order-1',
    sourceOrderItemId: 'item-1',
    receivedAt: new Date('2026-05-18T10:30:00.000Z'),
    ...overrides,
  };
}
