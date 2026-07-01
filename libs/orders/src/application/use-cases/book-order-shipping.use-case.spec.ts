import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { ShippingCarrierAdapterService } from '../services';
import { BookOrderShippingUseCase } from './book-order-shipping.use-case';

describe('BookOrderShippingUseCase', () => {
  let useCase: BookOrderShippingUseCase;

  const ordersRepositoryMock = {
    findOrderById: jest.fn(),
    bookOrderShipping: jest.fn(),
    createNotification: jest.fn(),
  };
  const shippingCarrierAdapterMock = {
    bookShipment: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookOrderShippingUseCase,
        { provide: OrdersRepository, useValue: ordersRepositoryMock },
        { provide: ShippingCarrierAdapterService, useValue: shippingCarrierAdapterMock },
      ],
    }).compile();

    useCase = module.get<BookOrderShippingUseCase>(BookOrderShippingUseCase);
  });

  it('books shipping and moves a processing order to shipping', async () => {
    const order = createOrderRecord();
    ordersRepositoryMock.findOrderById.mockResolvedValueOnce(order);
    shippingCarrierAdapterMock.bookShipment.mockResolvedValueOnce({
      trackingCode: 'GHN-ORDER12345',
      providerStatus: 'BOOKED',
    });
    ordersRepositoryMock.bookOrderShipping.mockResolvedValueOnce({
      ...order,
      fulfillmentStatus: 'SHIPPING',
      shippingTrackingCode: 'GHN-ORDER12345',
    });

    const result = await useCase.execute({
      id: 'order-1',
      requesterUserId: 'seller-user-1',
    });

    expect(shippingCarrierAdapterMock.bookShipment).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'order-1',
        providerCode: 'GHN',
        shippingAddress: '12 Nguyen Trai, Quan 1, TP.HCM',
        shippingDistrictId: 1450,
        shippingWardCode: '21211',
        shippingServiceId: 53320,
        shippingServiceTypeId: 2,
        parcelWeightGrams: 500,
        parcelLengthCm: 20,
        parcelWidthCm: 12,
        parcelHeightCm: 8,
      }),
    );
    expect(ordersRepositoryMock.bookOrderShipping).toHaveBeenCalledWith({
      id: 'order-1',
      actorUserId: 'seller-user-1',
      trackingCode: 'GHN-ORDER12345',
      providerStatus: 'BOOKED',
    });
    expect(ordersRepositoryMock.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'buyer-user-1',
        notificationType: 'ORDER_FULFILLMENT',
        targetId: 'order-1',
      }),
    );
    expect(result).toMatchObject({
      id: 'order-1',
      fulfillmentStatus: 'SHIPPING',
      shippingTrackingCode: 'GHN-ORDER12345',
    });
  });

  it('rejects booking before processing', async () => {
    ordersRepositoryMock.findOrderById.mockResolvedValueOnce(createOrderRecord({ fulfillmentStatus: 'PENDING' }));

    await expect(
      useCase.execute({
        id: 'order-1',
        requesterUserId: 'seller-user-1',
      }),
    ).rejects.toThrow('Order must be processing before booking shipping');
  });

  it('returns existing order when tracking code already exists', async () => {
    const order = createOrderRecord({ shippingTrackingCode: 'GHN-EXISTING' });
    ordersRepositoryMock.findOrderById.mockResolvedValueOnce(order);

    const result = await useCase.execute({
      id: 'order-1',
      requesterUserId: 'seller-user-1',
    });

    expect(shippingCarrierAdapterMock.bookShipment).not.toHaveBeenCalled();
    expect(ordersRepositoryMock.bookOrderShipping).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      id: 'order-1',
      shippingTrackingCode: 'GHN-EXISTING',
    });
  });
});

function createOrderRecord(overrides?: { fulfillmentStatus?: string; shippingTrackingCode?: string | null }) {
  return {
    id: 'order-1',
    orderStatus: 'paid',
    fulfillmentStatus: overrides?.fulfillmentStatus ?? 'PROCESSING',
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
    shippingTrackingCode: overrides?.shippingTrackingCode ?? null,
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
