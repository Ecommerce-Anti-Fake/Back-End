import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { CompleteOrderUseCase } from './complete-order.use-case';
import { CreateRetailOrderUseCase } from './create-retail-order.use-case';
import { MarkOrderPaidUseCase } from './mark-order-paid.use-case';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { OrderPlacementService } from '../services';

describe('Retail order lifecycle', () => {
  let createRetailOrderUseCase: CreateRetailOrderUseCase;
  let markOrderPaidUseCase: MarkOrderPaidUseCase;
  let completeOrderUseCase: CompleteOrderUseCase;

  let storedOrder: Record<string, unknown> | null;

  const ordersRepositoryMock = {
    findUserById: jest.fn(),
    findOfferForOrdering: jest.fn(),
    findOrderById: jest.fn(),
    markOrderPaid: jest.fn(),
    completeOrder: jest.fn(),
  };
  const orderPlacementServiceMock = {
    createOrder: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    storedOrder = null;

    ordersRepositoryMock.findUserById.mockResolvedValue({
      id: 'buyer-user-1',
      phone: '0987654321',
    });

    ordersRepositoryMock.findOfferForOrdering.mockResolvedValue({
      id: 'offer-1',
      title: 'Offer 1',
      price: new Prisma.Decimal(100),
      availableQuantity: 20,
      salesMode: 'RETAIL',
      minWholesaleQty: null,
      verificationLevel: 'SERIALIZED',
      productModelId: 'product-model-1',
      categoryId: 'category-1',
      shopId: 'seller-shop-1',
      shop: {
        id: 'seller-shop-1',
        shopName: 'Seller Shop',
        ownerUserId: 'seller-user-1',
      },
      productModel: {
        brandId: 'brand-1',
      },
      distributionNode: null,
    });

    orderPlacementServiceMock.createOrder.mockImplementation(async (payload) => {
      const orderPayload = payload.order;
      storedOrder = {
        id: 'order-1',
        orderMode: orderPayload.orderMode,
        orderStatus: orderPayload.orderStatus,
        shopId: orderPayload.shopId,
        buyerUserId: orderPayload.buyerUserId,
        buyerShopId: orderPayload.buyerShopId,
        buyerDistributionNodeId: orderPayload.buyerDistributionNodeId,
        baseAmount: new Prisma.Decimal(orderPayload.baseAmount),
        discountAmount: new Prisma.Decimal(orderPayload.discountAmount),
        platformFeeAmount: new Prisma.Decimal(orderPayload.platformFeeAmount),
        buyerPayableAmount: new Prisma.Decimal(orderPayload.buyerPayableAmount),
        sellerReceivableAmount: new Prisma.Decimal(orderPayload.sellerReceivableAmount),
        totalAmount: new Prisma.Decimal(orderPayload.totalAmount),
        createdAt: new Date('2026-04-20T10:00:00.000Z'),
        shop: {
          shopName: 'Seller Shop',
          ownerUserId: 'seller-user-1',
        },
        buyerShop: null,
        paymentIntent: {
          id: 'payment-1',
          orderId: 'order-1',
          paymentMethod: 'manual_confirmation',
          paymentStatus: 'PENDING',
          amount: new Prisma.Decimal(orderPayload.buyerPayableAmount),
          providerRef: null,
          createdAt: new Date('2026-04-20T10:00:00.000Z'),
        },
        escrow: {
          id: 'escrow-1',
          orderId: 'order-1',
          escrowStatus: 'PENDING',
          heldAmount: new Prisma.Decimal(0),
          holdAt: null,
          releaseAt: null,
        },
        items: [
          {
            id: 'item-1',
            offerId: orderPayload.item.offerId,
            offerTitleSnapshot: orderPayload.item.offerTitleSnapshot,
            unitPrice: new Prisma.Decimal(orderPayload.item.unitPrice),
            quantity: orderPayload.item.quantity,
            verificationLevelSnapshot: orderPayload.item.verificationLevelSnapshot,
            batchAllocations: [],
          },
        ],
      };

      return storedOrder;
    });

    ordersRepositoryMock.findOrderById.mockImplementation(async (id: string) => {
      if (storedOrder && storedOrder.id === id) {
        return storedOrder;
      }

      return null;
    });

    ordersRepositoryMock.markOrderPaid.mockImplementation(async ({ id, providerRef }) => {
      if (!storedOrder || storedOrder.id !== id) {
        return null;
      }

      storedOrder = {
        ...storedOrder,
        orderStatus: 'paid',
        paymentIntent: {
          ...(storedOrder.paymentIntent as Record<string, unknown>),
          paymentStatus: 'PAID',
          providerRef,
        },
        escrow: {
          ...(storedOrder.escrow as Record<string, unknown>),
          escrowStatus: 'HELD',
          heldAmount: storedOrder.buyerPayableAmount,
          holdAt: new Date('2026-04-20T10:05:00.000Z'),
          releaseAt: null,
        },
      };

      return storedOrder;
    });

    ordersRepositoryMock.completeOrder.mockImplementation(async (id: string) => {
      if (!storedOrder || storedOrder.id !== id) {
        return null;
      }

      storedOrder = {
        ...storedOrder,
        orderStatus: 'completed',
        escrow: {
          ...(storedOrder.escrow as Record<string, unknown>),
          escrowStatus: 'RELEASED',
          releaseAt: new Date('2026-04-20T10:10:00.000Z'),
        },
      };

      return storedOrder;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateRetailOrderUseCase,
        MarkOrderPaidUseCase,
        CompleteOrderUseCase,
        { provide: OrdersRepository, useValue: ordersRepositoryMock },
        { provide: OrderPlacementService, useValue: orderPlacementServiceMock },
      ],
    }).compile();

    createRetailOrderUseCase = module.get<CreateRetailOrderUseCase>(CreateRetailOrderUseCase);
    markOrderPaidUseCase = module.get<MarkOrderPaidUseCase>(MarkOrderPaidUseCase);
    completeOrderUseCase = module.get<CompleteOrderUseCase>(CompleteOrderUseCase);
  });

  it('should create, pay, and complete a retail order in sequence', async () => {
    const createdOrder = await createRetailOrderUseCase.execute({
      buyerUserId: 'buyer-user-1',
      offerId: 'offer-1',
      quantity: 2,
    });

    expect(createdOrder).toMatchObject({
      id: 'order-1',
      orderStatus: 'pending',
      buyerUserId: 'buyer-user-1',
      totalAmount: 200,
    });
    expect(orderPlacementServiceMock.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        order: expect.objectContaining({
          buyerUserId: 'buyer-user-1',
          orderMode: 'RETAIL',
          orderStatus: 'pending',
          totalAmount: 200,
        }),
      }),
    );

    const paidOrder = await markOrderPaidUseCase.execute({
      id: 'order-1',
      requesterUserId: 'buyer-user-1',
      providerRef: 'PAY-REF-001',
    });

    expect(paidOrder).toMatchObject({
      id: 'order-1',
      orderStatus: 'paid',
      paymentStatus: 'PAID',
      escrowStatus: 'HELD',
    });
    expect(ordersRepositoryMock.markOrderPaid).toHaveBeenCalledWith({
      id: 'order-1',
      providerRef: 'PAY-REF-001',
    });

    const completedOrder = await completeOrderUseCase.execute({
      id: 'order-1',
      requesterUserId: 'seller-user-1',
    });

    expect(completedOrder).toMatchObject({
      id: 'order-1',
      orderStatus: 'completed',
      paymentStatus: 'PAID',
      escrowStatus: 'RELEASED',
    });
    expect(ordersRepositoryMock.completeOrder).toHaveBeenCalledWith('order-1');
  });
});
