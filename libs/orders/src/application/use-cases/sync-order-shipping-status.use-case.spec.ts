import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { ShippingCarrierAdapterService } from '../services';
import { SyncOrderShippingStatusUseCase } from './sync-order-shipping-status.use-case';

describe('SyncOrderShippingStatusUseCase', () => {
  let useCase: SyncOrderShippingStatusUseCase;

  const ordersRepositoryMock = {
    findOrderById: jest.fn(),
    createAuditLog: jest.fn(),
    updateFulfillmentStatus: jest.fn(),
    createNotification: jest.fn(),
  };
  const shippingCarrierAdapterMock = {
    trackShipment: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncOrderShippingStatusUseCase,
        { provide: OrdersRepository, useValue: ordersRepositoryMock },
        { provide: ShippingCarrierAdapterService, useValue: shippingCarrierAdapterMock },
      ],
    }).compile();

    useCase = module.get<SyncOrderShippingStatusUseCase>(SyncOrderShippingStatusUseCase);
  });

  it('syncs delivered carrier status and moves a shipping order to delivered', async () => {
    const order = createOrderRecord();
    ordersRepositoryMock.findOrderById.mockResolvedValueOnce(order);
    shippingCarrierAdapterMock.trackShipment.mockResolvedValueOnce({
      providerStatus: 'delivered',
      fulfillmentStatus: 'DELIVERED',
    });
    ordersRepositoryMock.updateFulfillmentStatus.mockResolvedValueOnce({
      ...order,
      fulfillmentStatus: 'DELIVERED',
    });

    const result = await useCase.execute({
      id: 'order-1',
      requesterUserId: 'seller-user-1',
    });

    expect(shippingCarrierAdapterMock.trackShipment).toHaveBeenCalledWith({
      providerCode: 'GHN',
      trackingCode: 'GHN123456',
    });
    expect(ordersRepositoryMock.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SHIPPING_STATUS_SYNCED',
        fromStatus: 'SHIPPING',
        toStatus: 'DELIVERED',
        metadata: expect.objectContaining({
          providerStatus: 'delivered',
          shippingTrackingCode: 'GHN123456',
        }),
      }),
    );
    expect(ordersRepositoryMock.updateFulfillmentStatus).toHaveBeenCalledWith('order-1', 'DELIVERED');
    expect(ordersRepositoryMock.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'buyer-user-1',
        notificationType: 'ORDER_FULFILLMENT',
        targetId: 'order-1',
      }),
    );
    expect(result).toMatchObject({
      id: 'order-1',
      fulfillmentStatus: 'DELIVERED',
    });
  });

  it('audits in-transit status without changing fulfillment', async () => {
    const order = createOrderRecord();
    ordersRepositoryMock.findOrderById.mockResolvedValueOnce(order);
    shippingCarrierAdapterMock.trackShipment.mockResolvedValueOnce({
      providerStatus: 'transporting',
      fulfillmentStatus: 'SHIPPING',
    });

    const result = await useCase.execute({
      id: 'order-1',
      requesterUserId: 'seller-user-1',
    });

    expect(ordersRepositoryMock.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        fromStatus: 'SHIPPING',
        toStatus: 'SHIPPING',
      }),
    );
    expect(ordersRepositoryMock.updateFulfillmentStatus).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      id: 'order-1',
      fulfillmentStatus: 'SHIPPING',
    });
  });

  it('rejects syncing before a tracking code exists', async () => {
    ordersRepositoryMock.findOrderById.mockResolvedValueOnce(createOrderRecord({ shippingTrackingCode: null }));

    await expect(
      useCase.execute({
        id: 'order-1',
        requesterUserId: 'seller-user-1',
      }),
    ).rejects.toThrow('Order does not have a tracking code');
  });

  it('audits retryable carrier sync failures before returning the error', async () => {
    const order = createOrderRecord();
    ordersRepositoryMock.findOrderById.mockResolvedValueOnce(order);
    shippingCarrierAdapterMock.trackShipment.mockRejectedValueOnce(new Error('GHN timeout'));

    await expect(
      useCase.execute({
        id: 'order-1',
        requesterUserId: 'seller-user-1',
      }),
    ).rejects.toThrow('GHN timeout');

    expect(ordersRepositoryMock.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SHIPPING_STATUS_SYNC_FAILED',
        fromStatus: 'SHIPPING',
        toStatus: 'SHIPPING',
        note: 'GHN timeout',
        metadata: expect.objectContaining({
          shippingProviderCode: 'GHN',
          shippingTrackingCode: 'GHN123456',
          retryable: true,
          errorMessage: 'GHN timeout',
        }),
      }),
    );
    expect(ordersRepositoryMock.updateFulfillmentStatus).not.toHaveBeenCalled();
  });
});

function createOrderRecord(overrides?: { fulfillmentStatus?: string; shippingTrackingCode?: string | null }) {
  return {
    id: 'order-1',
    orderMode: 'RETAIL',
    orderStatus: 'paid',
    fulfillmentStatus: overrides?.fulfillmentStatus ?? 'SHIPPING',
    buyerUserId: 'buyer-user-1',
    buyerShopId: null,
    buyerDistributionNodeId: null,
    shopId: 'seller-shop-1',
    baseAmount: new Prisma.Decimal(200000),
    discountAmount: new Prisma.Decimal(0),
    platformFeeAmount: new Prisma.Decimal(40000),
    buyerPayableAmount: new Prisma.Decimal(225000),
    sellerReceivableAmount: new Prisma.Decimal(160000),
    totalAmount: new Prisma.Decimal(225000),
    shippingName: 'Buyer',
    shippingPhone: '0987654321',
    shippingAddress: '12 Nguyen Trai, Quan 1, TP.HCM',
    shippingProviderCode: 'GHN',
    shippingProviderName: 'Giao Hang Nhanh',
    shippingFeeAmount: new Prisma.Decimal(25000),
    shippingDistrictId: 1450,
    shippingDistrictName: 'Quan 1',
    shippingWardCode: '21211',
    shippingWardName: 'Phuong Ben Nghe',
    shippingServiceId: 53320,
    shippingServiceTypeId: 2,
    shippingTrackingCode: Object.prototype.hasOwnProperty.call(overrides ?? {}, 'shippingTrackingCode')
      ? overrides?.shippingTrackingCode ?? null
      : 'GHN123456',
    parcelWeightGrams: 500,
    parcelLengthCm: 20,
    parcelWidthCm: 12,
    parcelHeightCm: 8,
    createdAt: new Date('2026-05-26T10:00:00.000Z'),
    shop: {
      shopName: 'Seller Shop',
      ownerUserId: 'seller-user-1',
    },
    buyerShop: null,
    paymentIntent: {
      paymentStatus: 'PAID',
      paymentMethod: 'PAYOS',
      providerRef: 'PAYOS:payment-link',
      createdAt: new Date('2026-05-26T10:00:00.000Z'),
    },
    escrow: {
      escrowStatus: 'HELD',
      heldAmount: new Prisma.Decimal(225000),
      holdAt: new Date('2026-05-26T10:00:00.000Z'),
      releaseAt: null,
    },
    disputes: [],
    items: [],
  };
}
