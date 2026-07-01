import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { PayOSPaymentService } from '../services';
import { HandlePayOSWebhookUseCase } from './handle-payos-webhook.use-case';

describe('HandlePayOSWebhookUseCase', () => {
  let useCase: HandlePayOSWebhookUseCase;

  const ordersRepositoryMock = {
    findOrderByPaymentProviderRef: jest.fn(),
    markOrderPaid: jest.fn(),
    markOrderPaymentFailed: jest.fn(),
  };
  const payOSPaymentServiceMock = {
    verifyWebhook: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    useCase = new HandlePayOSWebhookUseCase(
      ordersRepositoryMock as unknown as OrdersRepository,
      payOSPaymentServiceMock as unknown as PayOSPaymentService,
    );
  });

  it('marks pending payOS order as failed on non-success webhook', async () => {
    const order = createOrderRecord();
    const failedOrder = createOrderRecord({ paymentStatus: 'FAILED' });
    payOSPaymentServiceMock.verifyWebhook.mockReturnValueOnce(true);
    ordersRepositoryMock.findOrderByPaymentProviderRef.mockResolvedValueOnce(order);
    ordersRepositoryMock.markOrderPaymentFailed.mockResolvedValueOnce(failedOrder);

    const result = await useCase.execute({
      code: '01',
      desc: 'Payment failed',
      success: false,
      signature: 'sig',
      data: {
        paymentLinkId: 'link-1',
        amount: 100,
        code: '01',
        reference: 'ref-1',
      },
    });

    expect(ordersRepositoryMock.markOrderPaymentFailed).toHaveBeenCalledWith({
      id: 'order-1',
      actorUserId: 'buyer-user-1',
      providerRef: 'PAYOS:link-1:ref-1',
      reason: 'Payment failed',
    });
    expect(ordersRepositoryMock.markOrderPaid).not.toHaveBeenCalled();
    expect(result.order).toMatchObject({
      id: 'order-1',
      orderStatus: 'pending',
      paymentStatus: 'FAILED',
    });
  });

  it('rejects webhook with invalid signature', async () => {
    payOSPaymentServiceMock.verifyWebhook.mockReturnValueOnce(false);

    await expect(
      useCase.execute({
        code: '00',
        desc: 'OK',
        success: true,
        signature: 'bad-sig',
        data: {},
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('ignores duplicate success webhook after order is already paid', async () => {
    const paidOrder = createOrderRecord({ orderStatus: 'paid', paymentStatus: 'PAID' });
    payOSPaymentServiceMock.verifyWebhook.mockReturnValueOnce(true);
    ordersRepositoryMock.findOrderByPaymentProviderRef.mockResolvedValueOnce(paidOrder);

    const result = await useCase.execute({
      code: '00',
      desc: 'OK',
      success: true,
      signature: 'sig',
      data: {
        paymentLinkId: 'link-1',
        amount: 100,
        code: '00',
        reference: 'ref-1',
      },
    });

    expect(ordersRepositoryMock.markOrderPaid).not.toHaveBeenCalled();
    expect(ordersRepositoryMock.markOrderPaymentFailed).not.toHaveBeenCalled();
    expect(result.order).toMatchObject({
      id: 'order-1',
      orderStatus: 'paid',
      paymentStatus: 'PAID',
    });
  });

  it('ignores duplicate failed webhook after payment is already failed', async () => {
    const failedOrder = createOrderRecord({ paymentStatus: 'FAILED' });
    payOSPaymentServiceMock.verifyWebhook.mockReturnValueOnce(true);
    ordersRepositoryMock.findOrderByPaymentProviderRef.mockResolvedValueOnce(failedOrder);

    const result = await useCase.execute({
      code: '01',
      desc: 'Payment failed',
      success: false,
      signature: 'sig',
      data: {
        paymentLinkId: 'link-1',
        amount: 100,
        code: '01',
        reference: 'ref-1',
      },
    });

    expect(ordersRepositoryMock.markOrderPaymentFailed).not.toHaveBeenCalled();
    expect(ordersRepositoryMock.markOrderPaid).not.toHaveBeenCalled();
    expect(result.order).toMatchObject({
      id: 'order-1',
      orderStatus: 'pending',
      paymentStatus: 'FAILED',
    });
  });

  it('ignores duplicate failed webhook after order is already paid', async () => {
    const paidOrder = createOrderRecord({ orderStatus: 'paid', paymentStatus: 'PAID' });
    payOSPaymentServiceMock.verifyWebhook.mockReturnValueOnce(true);
    ordersRepositoryMock.findOrderByPaymentProviderRef.mockResolvedValueOnce(paidOrder);

    const result = await useCase.execute({
      code: '01',
      desc: 'Payment failed',
      success: false,
      signature: 'sig',
      data: {
        paymentLinkId: 'link-1',
        amount: 100,
        code: '01',
        reference: 'ref-1',
      },
    });

    expect(ordersRepositoryMock.markOrderPaymentFailed).not.toHaveBeenCalled();
    expect(ordersRepositoryMock.markOrderPaid).not.toHaveBeenCalled();
    expect(result.order).toMatchObject({
      id: 'order-1',
      orderStatus: 'paid',
      paymentStatus: 'PAID',
    });
  });

  it('ignores stale webhook for an old payOS link after retry changes provider ref', async () => {
    payOSPaymentServiceMock.verifyWebhook.mockReturnValueOnce(true);
    ordersRepositoryMock.findOrderByPaymentProviderRef.mockResolvedValueOnce(null);

    const result = await useCase.execute({
      code: '00',
      desc: 'OK',
      success: true,
      signature: 'sig',
      data: {
        paymentLinkId: 'old-link',
        amount: 100,
        code: '00',
        reference: 'old-ref',
      },
    });

    expect(ordersRepositoryMock.findOrderByPaymentProviderRef).toHaveBeenCalledWith('PAYOS:old-link');
    expect(ordersRepositoryMock.markOrderPaid).not.toHaveBeenCalled();
    expect(ordersRepositoryMock.markOrderPaymentFailed).not.toHaveBeenCalled();
    expect(result).toEqual({
      received: true,
      ignored: true,
      reason: 'order_not_found',
    });
  });

  it('ignores stale failed webhook for an old payOS link after retry changes provider ref', async () => {
    payOSPaymentServiceMock.verifyWebhook.mockReturnValueOnce(true);
    ordersRepositoryMock.findOrderByPaymentProviderRef.mockResolvedValueOnce(null);

    const result = await useCase.execute({
      code: '01',
      desc: 'Payment failed',
      success: false,
      signature: 'sig',
      data: {
        paymentLinkId: 'old-link',
        amount: 100,
        code: '01',
        reference: 'old-ref',
      },
    });

    expect(ordersRepositoryMock.findOrderByPaymentProviderRef).toHaveBeenCalledWith('PAYOS:old-link');
    expect(ordersRepositoryMock.markOrderPaid).not.toHaveBeenCalled();
    expect(ordersRepositoryMock.markOrderPaymentFailed).not.toHaveBeenCalled();
    expect(result).toEqual({
      received: true,
      ignored: true,
      reason: 'order_not_found',
    });
  });
});

function createOrderRecord(overrides?: { orderStatus?: string; paymentStatus?: string }) {
  return {
    id: 'order-1',
    orderStatus: overrides?.orderStatus ?? 'pending',
    fulfillmentStatus: 'PENDING',
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
    shippingName: 'Buyer',
    shippingPhone: '0900000000',
    shippingAddress: 'Address',
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
      paymentStatus: overrides?.paymentStatus ?? 'PENDING',
      amount: new Prisma.Decimal(100),
      providerRef: 'PAYOS:link-1',
      createdAt: new Date('2026-04-15T10:00:00.000Z'),
    },
    escrow: {
      id: 'escrow-1',
      orderId: 'order-1',
      escrowStatus: 'PENDING',
      heldAmount: new Prisma.Decimal(0),
      holdAt: null,
      releaseAt: null,
    },
    disputes: [],
    items: [
      {
        id: 'item-1',
        offerId: 'offer-1',
        offerTitleSnapshot: 'Offer 1',
        unitPrice: new Prisma.Decimal(100),
        quantity: 1,
        verificationLevelSnapshot: 'SERIALIZED',
        offer: { media: [] },
        reviews: [],
        batchAllocations: [],
      },
    ],
  };
}
