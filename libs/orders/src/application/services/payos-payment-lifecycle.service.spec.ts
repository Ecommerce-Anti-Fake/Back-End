import { PayOSPaymentLifecycleService } from './payos-payment-lifecycle.service';

describe('order PayOS lifecycle', () => {
  const attempt = {
    paymentLinkId: 'link',
    orderId: 'order',
    orderCode: BigInt(123),
    amount: 100,
    status: 'PENDING',
    expiresAt: new Date(Date.now() + 900000),
    checkoutUrl: 'https://pay.payos.vn/web/link',
    qrCode: 'qr',
  };
  const prisma = {
    orderPayOSPaymentAttempt: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    order: { findUnique: jest.fn() },
    paymentIntent: { updateMany: jest.fn() },
  };
  const orders = { findOrderById: jest.fn() };
  const provider = { getPaymentLink: jest.fn(), cancelPaymentLink: jest.fn() };
  const webhook = { settleVerifiedPayment: jest.fn() };
  const cancellation = { execute: jest.fn() };
  let service: PayOSPaymentLifecycleService;
  beforeEach(() => {
    jest.resetAllMocks();
    prisma.order.findUnique.mockResolvedValue({ orderStatus: 'pending' });
    service = new PayOSPaymentLifecycleService(
      prisma as never,
      orders as never,
      provider as never,
      webhook as never,
      cancellation as never,
    );
    orders.findOrderById.mockResolvedValue({
      id: 'order',
      buyerUserId: 'buyer',
      orderStatus: 'pending',
      paymentIntent: { paymentMethod: 'PAYOS', paymentStatus: 'PENDING' },
    });
    prisma.orderPayOSPaymentAttempt.findFirst.mockResolvedValue(attempt);
    provider.getPaymentLink.mockResolvedValue({
      status: 'PENDING',
      amount: 100,
    });
  });
  it('resumes exactly the original link and expiry after ownership verification', async () => {
    const result = await service.resume({
      id: 'order',
      requesterUserId: 'buyer',
    });
    expect(result).toMatchObject({
      paymentLinkId: 'link',
      qrCode: 'qr',
      expiresAt: attempt.expiresAt.toISOString(),
      status: 'PENDING',
    });
    expect(provider.getPaymentLink).toHaveBeenCalledWith('link');
  });
  it('rejects another buyer before querying the provider', async () => {
    await expect(
      service.resume({ id: 'order', requesterUserId: 'attacker' }),
    ).rejects.toThrow();
    expect(provider.getPaymentLink).not.toHaveBeenCalled();
  });
  it('does not claim cancellation if payment won the race', async () => {
    provider.cancelPaymentLink.mockResolvedValue({
      status: 'PAID',
      amount: 100,
      amountPaid: 100,
    });
    const result = await service.cancel({
      id: 'order',
      requesterUserId: 'buyer',
    });
    expect(result.status).toBe('PAID');
    expect(webhook.settleVerifiedPayment).toHaveBeenCalledWith('link', 100);
    expect(cancellation.execute).not.toHaveBeenCalled();
  });
  it('keeps expired pending provider links non-resumable without cancelling the order', async () => {
    prisma.orderPayOSPaymentAttempt.findFirst.mockResolvedValue({
      ...attempt,
      expiresAt: new Date(Date.now() - 1000),
    });
    provider.cancelPaymentLink.mockResolvedValue({
      status: 'CANCELLED',
      amount: 100,
    });
    expect(
      (await service.resume({ id: 'order', requesterUserId: 'buyer' })).status,
    ).toBe('EXPIRED');
    expect(cancellation.execute).not.toHaveBeenCalled();
  });
  it('rejects a PAID provider status with a short paid amount', async () => {
    provider.getPaymentLink.mockResolvedValue({
      status: 'PAID',
      amount: 100,
      amountPaid: 99,
    });
    await expect(
      service.resume({ id: 'order', requesterUserId: 'buyer' }),
    ).rejects.toThrow('paid amount');
    expect(webhook.settleVerifiedPayment).not.toHaveBeenCalled();
  });
  it('returns PAID without a QR when an older attempt already paid the order', async () => {
    orders.findOrderById.mockResolvedValue({
      buyerUserId: 'buyer',
      orderStatus: 'paid',
      paymentIntent: { paymentMethod: 'PAYOS', paymentStatus: 'PAID' },
    });
    expect(
      await service.resume({ id: 'order', requesterUserId: 'buyer' }),
    ).toMatchObject({ status: 'PAID', qrCode: null, checkoutUrl: null });
  });
  it('does not claim cancellation until the provider confirms it', async () => {
    provider.cancelPaymentLink.mockResolvedValue({
      status: 'PENDING',
      amount: 100,
    });
    expect(
      (await service.cancel({ id: 'order', requesterUserId: 'buyer' })).status,
    ).toBe('PENDING');
    expect(cancellation.execute).not.toHaveBeenCalled();
  });
  it('preserves a manual cancellation after its original deadline passes', async () => {
    prisma.orderPayOSPaymentAttempt.findFirst.mockResolvedValue({
      ...attempt,
      status: 'CANCELLED',
      expiresAt: new Date(Date.now() - 1000),
    });
    provider.getPaymentLink.mockResolvedValue({
      status: 'CANCELLED',
      amount: 100,
    });
    expect(
      (await service.resume({ id: 'order', requesterUserId: 'buyer' })).status,
    ).toBe('CANCELLED');
  });
  it('reconciles expired attempts without any user request', async () => {
    prisma.orderPayOSPaymentAttempt.findMany.mockResolvedValue([
      { ...attempt, expiresAt: new Date(Date.now() - 1000) },
    ]);
    provider.cancelPaymentLink.mockResolvedValue({
      status: 'CANCELLED',
      amount: 100,
    });
    await service.reconcilePending();
    expect(prisma.paymentIntent.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { paymentStatus: 'EXPIRED' } }),
    );
    expect(cancellation.execute).not.toHaveBeenCalled();
    expect(orders.findOrderById).not.toHaveBeenCalled();
  });
  it('advances failed reconciliation metadata so later links are not starved', async () => {
    prisma.orderPayOSPaymentAttempt.findMany.mockResolvedValue([attempt]);
    provider.getPaymentLink.mockRejectedValue(new Error('unavailable'));
    await service.reconcilePending();
    expect(prisma.orderPayOSPaymentAttempt.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lastCheckedAt: expect.any(Date) as unknown,
        }) as unknown,
      }),
    );
  });
  it('closes an outstanding provider link when the order was already cancelled', async () => {
    prisma.order.findUnique.mockResolvedValue({ orderStatus: 'cancelled' });
    provider.cancelPaymentLink.mockResolvedValue({
      status: 'CANCELLED',
      amount: 100,
    });
    expect(
      await service.resume({ id: 'order', requesterUserId: 'buyer' }),
    ).toMatchObject({ status: 'CANCELLED', checkoutUrl: null, qrCode: null });
  });
  it('hides checkout when domain cancellation is final but provider cancellation is not confirmed', async () => {
    orders.findOrderById.mockResolvedValue({
      buyerUserId: 'buyer',
      orderStatus: 'cancelled',
      paymentIntent: { paymentMethod: 'PAYOS', paymentStatus: 'CANCELLED' },
    });
    prisma.order.findUnique.mockResolvedValue({ orderStatus: 'cancelled' });
    provider.cancelPaymentLink.mockResolvedValue({
      status: 'PENDING',
      amount: 100,
    });
    expect(
      await service.resume({ id: 'order', requesterUserId: 'buyer' }),
    ).toMatchObject({
      status: 'PENDING',
      canResume: false,
      canRetry: false,
      checkoutUrl: null,
      qrCode: null,
    });
  });
  it('runs existing order cancellation rules only after provider confirms cancellation', async () => {
    provider.cancelPaymentLink.mockResolvedValue({
      status: 'CANCELLED',
      amount: 100,
    });
    expect(
      (await service.cancel({ id: 'order', requesterUserId: 'buyer' })).status,
    ).toBe('CANCELLED');
    expect(cancellation.execute).toHaveBeenCalledWith({
      id: 'order',
      requesterUserId: 'buyer',
    });
  });
});
