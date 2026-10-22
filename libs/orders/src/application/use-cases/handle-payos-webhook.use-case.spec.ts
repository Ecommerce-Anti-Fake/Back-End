import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { HandlePayOSWebhookUseCase } from './handle-payos-webhook.use-case';

describe('HandlePayOSWebhookUseCase', () => {
  const ordersRepository = {
    findOrderByPaymentProviderRef: jest.fn(),
    findOrderById: jest.fn(),
    markOrderPaid: jest.fn(),
    markOrderPaidInTransaction: jest.fn(),
    markOrderPaymentFailed: jest.fn(),
  };
  const payOSPaymentService = { verifyWebhook: jest.fn() };
  const prisma = {
    $transaction: jest.fn(),
    orderPayOSPaymentAttempt: { findUnique: jest.fn() },
  };
  const walletRepository = {
    findOrCreatePlatformWalletInTransaction: jest.fn(),
    executeTransactionInTransaction: jest.fn(),
  };
  let useCase: HandlePayOSWebhookUseCase;
  let tx: {
    $queryRaw: jest.Mock;
    paymentIntent: { findUnique: jest.Mock };
    orderPayOSPaymentAttempt: { update: jest.Mock };
    walletTransaction: { findUnique: jest.Mock };
    wallet: { update: jest.Mock };
  };

  beforeEach(() => {
    jest.resetAllMocks();
    useCase = new HandlePayOSWebhookUseCase(
      ordersRepository as never,
      payOSPaymentService as never,
      prisma as never,
      walletRepository as never,
    );
    payOSPaymentService.verifyWebhook.mockReturnValue(true);
    tx = {
      $queryRaw: jest.fn(),
      paymentIntent: { findUnique: jest.fn() },
      orderPayOSPaymentAttempt: { update: jest.fn() },
      walletTransaction: { findUnique: jest.fn().mockResolvedValue(null) },
      wallet: { update: jest.fn() },
    };
    prisma.$transaction.mockImplementation(
      (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    );
    walletRepository.findOrCreatePlatformWalletInTransaction
      .mockResolvedValueOnce({ id: 'clearing-wallet' })
      .mockResolvedValueOnce({ id: 'escrow-wallet' });
  });

  it('marks the existing order paid on a verified success webhook', async () => {
    const order = createOrder();
    const paidOrder = createOrder({
      orderStatus: 'paid',
      paymentStatus: 'PAID',
    });
    ordersRepository.findOrderByPaymentProviderRef.mockResolvedValue(order);
    ordersRepository.markOrderPaidInTransaction.mockResolvedValue(paidOrder);

    const result = await useCase.execute(webhook());

    expect(ordersRepository.markOrderPaidInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      {
        id: 'order-1',
        actorUserId: 'buyer-1',
        providerRef: 'PAYOS:link-1:link-1',
      },
    );
    expect(result).toEqual({ received: true });
    expect(
      walletRepository.executeTransactionInTransaction,
    ).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        transactionType: 'ESCROW_HOLD',
        idempotencyKey: 'ORDER:order-1:PAYOS_ESCROW_HOLD',
        orderId: 'order-1',
      }),
    );
  });

  it('marks payment failed while leaving cart cleanup to the success transaction', async () => {
    const order = createOrder();
    ordersRepository.findOrderByPaymentProviderRef.mockResolvedValue(order);
    ordersRepository.markOrderPaymentFailed.mockResolvedValue(
      createOrder({ paymentStatus: 'FAILED' }),
    );

    await useCase.execute(
      webhook({ code: '01', success: false, dataCode: '01' }),
    );

    expect(ordersRepository.markOrderPaymentFailed).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'order-1' }),
    );
    expect(ordersRepository.markOrderPaidInTransaction).not.toHaveBeenCalled();
  });

  it('ignores stale webhook links after retry', async () => {
    ordersRepository.findOrderByPaymentProviderRef.mockResolvedValue(null);
    await expect(useCase.execute(webhook())).resolves.toEqual({
      received: true,
      ignored: true,
      reason: 'order_not_found',
    });
  });

  it('accepts a late success from the durable old attempt after retry', async () => {
    prisma.orderPayOSPaymentAttempt.findUnique.mockResolvedValue({
      paymentLinkId: 'link-1',
      orderId: 'order-1',
      status: 'EXPIRED',
    });
    ordersRepository.findOrderById.mockResolvedValue(
      createOrder({ paymentStatus: 'EXPIRED' }),
    );
    await useCase.execute(webhook());
    expect(tx.orderPayOSPaymentAttempt.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'PAID' }) as unknown,
      }),
    );
    expect(
      walletRepository.executeTransactionInTransaction,
    ).toHaveBeenCalledTimes(1);
  });

  it('does not write a second escrow hold when duplicate or another attempt is already paid', async () => {
    ordersRepository.findOrderByPaymentProviderRef.mockResolvedValue(
      createOrder(),
    );
    tx.paymentIntent.findUnique.mockResolvedValue({ paymentStatus: 'PAID' });
    await useCase.execute(webhook());
    expect(
      walletRepository.executeTransactionInTransaction,
    ).not.toHaveBeenCalled();
  });

  it('ignores a stale failure from a superseded durable attempt', async () => {
    prisma.orderPayOSPaymentAttempt.findUnique.mockResolvedValue({
      orderId: 'order-1',
    });
    ordersRepository.findOrderById.mockResolvedValue({
      ...createOrder(),
      paymentIntent: {
        paymentStatus: 'PENDING',
        providerRef: 'PAYOS:new-link',
      },
    });
    await useCase.execute(
      webhook({ success: false, code: '01', dataCode: '01' }),
    );
    expect(ordersRepository.markOrderPaymentFailed).not.toHaveBeenCalled();
  });

  it('retries a serialization conflict before acknowledging provider payment', async () => {
    ordersRepository.findOrderByPaymentProviderRef.mockResolvedValue(
      createOrder(),
    );
    prisma.$transaction.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('conflict', {
        code: 'P2034',
        clientVersion: 'test',
      }),
    );
    await useCase.execute(webhook());
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it('rejects invalid signatures', async () => {
    payOSPaymentService.verifyWebhook.mockReturnValue(false);
    await expect(useCase.execute(webhook())).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  function webhook(
    overrides: { code?: string; success?: boolean; dataCode?: string } = {},
  ) {
    return {
      code: overrides.code ?? '00',
      desc: overrides.success === false ? 'Failed' : 'OK',
      success: overrides.success ?? true,
      signature: 'sig',
      data: {
        paymentLinkId: 'link-1',
        amount: 100,
        code: overrides.dataCode ?? '00',
        reference: 'ref-1',
      },
    };
  }

  function createOrder(
    overrides: { orderStatus?: string; paymentStatus?: string } = {},
  ) {
    return {
      id: 'order-1',
      buyerUserId: 'buyer-1',
      buyerShop: null,
      orderStatus: overrides.orderStatus ?? 'pending',
      fulfillmentStatus: 'PENDING',
      shopId: 'shop-1',
      shop: { shopName: 'Shop', ownerUserId: 'seller-1' },
      baseAmount: new Prisma.Decimal(100),
      discountAmount: new Prisma.Decimal(0),
      platformFeeAmount: new Prisma.Decimal(20),
      buyerPayableAmount: new Prisma.Decimal(100),
      sellerReceivableAmount: new Prisma.Decimal(80),
      totalAmount: new Prisma.Decimal(100),
      shippingName: 'Buyer',
      shippingPhone: '0900',
      shippingAddress: 'Address',
      createdAt: new Date(),
      paymentIntent: {
        paymentMethod: 'PAYOS',
        paymentStatus: overrides.paymentStatus ?? 'PENDING',
      },
      escrow: null,
      disputes: [],
      items: [],
      shopGroups: [],
    };
  }
});
