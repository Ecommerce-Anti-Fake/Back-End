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
  const lifecycle = { resume: jest.fn() };
  const tx = {
    $queryRaw: jest.fn(),
    order: { findUniqueOrThrow: jest.fn() },
    paymentIntent: { findUniqueOrThrow: jest.fn(), update: jest.fn() },
    orderPayOSPaymentAttempt: { create: jest.fn() },
  };
  const prisma = { $transaction: jest.fn(), auditLog: { create: jest.fn() } };
  let useCase: RetryPayOSPaymentUseCase;

  beforeEach(() => {
    jest.resetAllMocks();
    tx.order.findUniqueOrThrow.mockResolvedValue({ orderStatus: 'pending' });
    lifecycle.resume.mockResolvedValue({ status: 'EXPIRED' });
    prisma.$transaction.mockImplementation(
      (fn: (client: typeof tx) => Promise<unknown>) => fn(tx),
    );
    tx.paymentIntent.findUniqueOrThrow.mockResolvedValue({
      paymentStatus: 'EXPIRED',
      amount: new Prisma.Decimal(200),
    });
    useCase = new RetryPayOSPaymentUseCase(
      ordersRepositoryMock as unknown as OrdersRepository,
      payOSPaymentServiceMock as unknown as PayOSPaymentService,
      lifecycle as never,
      prisma as never,
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
    ordersRepositoryMock.findOrderById.mockResolvedValueOnce(resetOrder);

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
    expect(tx.orderPayOSPaymentAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ paymentLinkId: 'new-link' }) as unknown,
      }),
    );
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

  it('does not create a link when cancellation wins before the retry lock', async () => {
    ordersRepositoryMock.findOrderById.mockResolvedValueOnce(
      createOrderRecord({ paymentStatus: 'EXPIRED' }),
    );
    tx.order.findUniqueOrThrow.mockResolvedValue({ orderStatus: 'cancelled' });
    await expect(
      useCase.execute({ id: 'order-1', requesterUserId: 'buyer-user-1' }),
    ).rejects.toThrow('no longer pending');
    expect(payOSPaymentServiceMock.createPaymentLink).not.toHaveBeenCalled();
  });

  it('recovers a failed link creation with no exposed provider reference', async () => {
    const order = createOrderRecord({ paymentStatus: 'FAILED' });
    ordersRepositoryMock.findOrderById.mockResolvedValue({
      ...order,
      paymentIntent: { ...order.paymentIntent, providerRef: null },
    });
    payOSPaymentServiceMock.createPaymentLink.mockResolvedValue({
      orderCode: 123,
      paymentLinkId: 'fresh',
      checkoutUrl: 'https://pay.payos.vn/web/fresh',
      expiresAt: new Date(Date.now() + 900000).toISOString(),
    });
    await useCase.execute({ id: 'order-1', requesterUserId: 'buyer-user-1' });
    expect(lifecycle.resume).not.toHaveBeenCalled();
    expect(payOSPaymentServiceMock.createPaymentLink).toHaveBeenCalledTimes(1);
  });

  it('rejects retry from seller owner', async () => {
    ordersRepositoryMock.findOrderById.mockResolvedValueOnce(
      createOrderRecord({ paymentStatus: 'FAILED' }),
    );

    await expect(
      useCase.execute({
        id: 'order-1',
        requesterUserId: 'seller-user-1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires failed payOS payment on a pending order', async () => {
    ordersRepositoryMock.findOrderById.mockResolvedValueOnce(
      createOrderRecord({ paymentStatus: 'PAID', orderStatus: 'paid' }),
    );

    await expect(
      useCase.execute({
        id: 'order-1',
        requesterUserId: 'buyer-user-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

function createOrderRecord(overrides?: {
  orderStatus?: string;
  paymentStatus?: string;
  providerRef?: string;
}) {
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
