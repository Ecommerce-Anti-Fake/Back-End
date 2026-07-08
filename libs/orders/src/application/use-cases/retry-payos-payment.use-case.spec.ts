import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { PayOSPaymentService } from '../services';
import { RetryPayOSPaymentUseCase } from './retry-payos-payment.use-case';

describe('RetryPayOSPaymentUseCase', () => {
  const ordersRepositoryMock = {
    findOrderById: jest.fn(),
    updatePaymentProviderRefAndStatus: jest.fn(),
  };
  const payOSPaymentServiceMock = {
    createPaymentLink: jest.fn(),
  };
  let useCase: RetryPayOSPaymentUseCase;

  beforeEach(() => {
    jest.resetAllMocks();
    useCase = new RetryPayOSPaymentUseCase(
      ordersRepositoryMock as unknown as OrdersRepository,
      payOSPaymentServiceMock as unknown as PayOSPaymentService,
    );
  });

  it('creates a new payOS link for buyer failed pending order', async () => {
    const failedOrder = createOrderRecord({ paymentStatus: 'FAILED' });
    const resetOrder = createOrderRecord({
      paymentStatus: 'PENDING',
      providerRef: 'PAYOS:new-link',
    });
    ordersRepositoryMock.findOrderById.mockResolvedValueOnce(failedOrder);
    payOSPaymentServiceMock.createPaymentLink.mockResolvedValueOnce({
      orderCode: 1776240000123,
      paymentLinkId: 'new-link',
      checkoutUrl: 'https://pay.payos.vn/web/new-link',
      qrCode: 'qr-code',
    });
    ordersRepositoryMock.updatePaymentProviderRefAndStatus.mockResolvedValueOnce(resetOrder);

    const result = await useCase.execute({
      id: 'order-1',
      requesterUserId: 'buyer-user-1',
    });

    expect(payOSPaymentServiceMock.createPaymentLink).toHaveBeenCalledWith({
      orderId: 'order-1',
      amount: 200,
      description: 'DHorder1',
      buyerName: 'Buyer',
      buyerPhone: '0987654321',
      itemName: 'Offer 1',
      quantity: 2,
    });
    expect(ordersRepositoryMock.updatePaymentProviderRefAndStatus).toHaveBeenCalledWith({
      orderId: 'order-1',
      actorUserId: 'buyer-user-1',
      providerRef: 'PAYOS:new-link',
      paymentStatus: 'PENDING',
      note: 'Buyer retried payOS payment; waiting for provider confirmation',
    });
    expect(result).toMatchObject({
      id: 'order-1',
      paymentStatus: 'PENDING',
      paymentProviderRef: 'PAYOS:new-link',
      payOSOrderCode: 1776240000123,
      payOSPaymentLinkId: 'new-link',
      payOSCheckoutUrl: 'https://pay.payos.vn/web/new-link',
      payOSQrCode: 'qr-code',
    });
  });

  it('rejects retry from seller owner', async () => {
    ordersRepositoryMock.findOrderById.mockResolvedValueOnce(createOrderRecord({ paymentStatus: 'FAILED' }));

    await expect(
      useCase.execute({
        id: 'order-1',
        requesterUserId: 'seller-user-1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires failed payOS payment on a pending order', async () => {
    ordersRepositoryMock.findOrderById.mockResolvedValueOnce(createOrderRecord({ paymentStatus: 'PAID', orderStatus: 'paid' }));

    await expect(
      useCase.execute({
        id: 'order-1',
        requesterUserId: 'buyer-user-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

function createOrderRecord(overrides?: { orderStatus?: string; paymentStatus?: string; providerRef?: string }) {
  return {
    id: 'order-1',
    orderStatus: overrides?.orderStatus ?? 'pending',
    fulfillmentStatus: 'PENDING',
    shopId: 'seller-shop-1',
    buyerUserId: 'buyer-user-1',
    buyerShopId: null,
    buyerDistributionNodeId: null,
    baseAmount: new Prisma.Decimal(200),
    discountAmount: new Prisma.Decimal(0),
    platformFeeAmount: new Prisma.Decimal(40),
    buyerPayableAmount: new Prisma.Decimal(200),
    sellerReceivableAmount: new Prisma.Decimal(160),
    totalAmount: new Prisma.Decimal(200),
    shippingName: 'Buyer',
    shippingPhone: '0987654321',
    shippingAddress: '12 Nguyen Trai, Quan 1, TP.HCM',
    createdAt: new Date('2026-05-16T10:00:00.000Z'),
    shop: {
      shopName: 'Seller Shop',
      ownerUserId: 'seller-user-1',
    },
    buyerShop: null,
    paymentIntent: {
      id: 'payment-1',
      orderId: 'order-1',
      paymentMethod: 'PAYOS',
      paymentStatus: overrides?.paymentStatus ?? 'FAILED',
      providerRef: overrides?.providerRef ?? 'PAYOS:old-link',
      amount: new Prisma.Decimal(200),
      createdAt: new Date('2026-05-16T10:00:00.000Z'),
      updatedAt: new Date('2026-05-16T10:00:00.000Z'),
    },
    escrow: {
      id: 'escrow-1',
      orderId: 'order-1',
      escrowStatus: 'PENDING',
      heldAmount: new Prisma.Decimal(0),
      holdAt: null,
      releaseAt: null,
      createdAt: new Date('2026-05-16T10:00:00.000Z'),
      updatedAt: new Date('2026-05-16T10:00:00.000Z'),
    },
    disputes: [],
    items: [
      {
        id: 'order-item-1',
        orderId: 'order-1',
        offerId: 'offer-1',
        offerTitleSnapshot: 'Offer 1',
        unitPrice: new Prisma.Decimal(100),
        quantity: 2,
        batchAllocations: [],
        reviews: [],
        offer: {
          media: [],
        },
      },
    ],
  };
}
