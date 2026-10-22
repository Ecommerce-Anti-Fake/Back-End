import { Prisma } from '@prisma/client';
import { HandleWalletTopUpWebhookUseCase } from './handle-wallet-top-up-webhook.use-case';

const webhook = (overrides: Record<string, unknown> = {}) => {
  const { dataCode = '00', ...dataOverrides } = overrides;
  return {
    code: '00',
    desc: 'success',
    success: true,
    signature: 'sig',
    data: { paymentLinkId: 'link-1', amount: 100000, code: dataCode, ...dataOverrides },
  };
};

describe('HandleWalletTopUpWebhookUseCase', () => {
  it('rejects an invalid provider signature', async () => {
    const payOS = { verifyWebhook: jest.fn().mockReturnValue(false) };
    const useCase = new HandleWalletTopUpWebhookUseCase({} as never, {} as never, payOS as never, {} as never);
    await expect(useCase.execute(webhook())).rejects.toThrow('Chữ ký webhook');
  });

  it('credits the wallet once for a successful webhook', async () => {
    const topUp = { id: 'top-up-1', walletId: 'wallet-1', amount: new Prisma.Decimal(100000), status: 'PENDING' };
    const tx = { walletTopUp: { findUnique: jest.fn().mockResolvedValue(topUp), update: jest.fn() } };
    const prisma = { walletTopUp: { findUnique: jest.fn().mockResolvedValue(topUp) }, $transaction: jest.fn(async (callback: (value: typeof tx) => unknown) => callback(tx)) };
    const repository = { executeTransactionInTransaction: jest.fn() };
    const codSettlement = { settleOutstandingForWalletInTransaction: jest.fn() };
    const useCase = new HandleWalletTopUpWebhookUseCase(
      prisma as never,
      repository as never,
      { verifyWebhook: jest.fn().mockReturnValue(true) } as never,
      codSettlement as never,
    );

    await expect(useCase.execute(webhook())).resolves.toEqual({ success: true, message: 'Nạp tiền vào ví thành công.' });
    expect(repository.executeTransactionInTransaction).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ idempotencyKey: 'WALLET_TOP_UP:top-up-1:CREDIT' }));
    expect(codSettlement.settleOutstandingForWalletInTransaction).toHaveBeenCalledWith(tx, 'wallet-1');
    expect(tx.walletTopUp.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'PAID' }) }));
  });

  it('does not credit a webhook that was already completed', async () => {
    const topUp = { id: 'top-up-1', walletId: 'wallet-1', amount: new Prisma.Decimal(100000), status: 'PAID' };
    const prisma = { walletTopUp: { findUnique: jest.fn().mockResolvedValue(topUp) }, $transaction: jest.fn(async (callback: (value: unknown) => unknown) => callback({ walletTopUp: { findUnique: jest.fn().mockResolvedValue(topUp) } })) };
    const repository = { executeTransactionInTransaction: jest.fn() };
    const useCase = new HandleWalletTopUpWebhookUseCase(prisma as never, repository as never, { verifyWebhook: jest.fn().mockReturnValue(true) } as never, {} as never);

    await expect(useCase.execute(webhook())).resolves.toEqual({ success: true, message: 'Webhook nạp ví đã được xử lý.' });
    expect(repository.executeTransactionInTransaction).not.toHaveBeenCalled();
  });

  it('does not credit a webhook with a failed nested provider code', async () => {
    const topUp = { id: 'top-up-1', walletId: 'wallet-1', amount: new Prisma.Decimal(100000), status: 'PENDING' };
    const tx = { walletTopUp: { findUnique: jest.fn().mockResolvedValue(topUp), update: jest.fn() } };
    const prisma = { walletTopUp: { findUnique: jest.fn().mockResolvedValue(topUp) }, $transaction: jest.fn(async (callback: (value: typeof tx) => unknown) => callback(tx)) };
    const repository = { executeTransactionInTransaction: jest.fn() };
    const useCase = new HandleWalletTopUpWebhookUseCase(
      prisma as never,
      repository as never,
      { verifyWebhook: jest.fn().mockReturnValue(true) } as never,
      {} as never,
    );

    await useCase.execute(webhook({ dataCode: '01' }));

    expect(repository.executeTransactionInTransaction).not.toHaveBeenCalled();
    expect(tx.walletTopUp.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED' }) }),
    );
  });

  function fixture(status = 'PENDING') {
    const topUp = { id: 'top-up-1', walletId: 'wallet-1', paymentLinkId: 'link-1', amount: new Prisma.Decimal(100000), status, expiresAt: new Date(Date.now() - 1000) };
    const store = {
      findUnique: jest.fn(async () => ({ ...topUp })),
      findFirst: jest.fn(async () => ({ ...topUp })),
      findUniqueOrThrow: jest.fn(async () => ({ ...topUp })),
      update: jest.fn(async ({ data }: { data: { status: string } }) => Object.assign(topUp, data)),
      updateMany: jest.fn(async ({ where, data }: { where: { status: { not: string } }; data: object }) => { if (topUp.status !== where.status.not) Object.assign(topUp, data); return { count: 1 }; }),
    };
    const prisma = { walletTopUp: store, $transaction: jest.fn(async (callback: (tx: unknown) => unknown) => callback({ walletTopUp: store })) };
    const repository = { executeTransactionInTransaction: jest.fn(), canAccessShopWallet: jest.fn().mockResolvedValue(true) };
    const payOS = { verifyWebhook: jest.fn().mockReturnValue(true), getPaymentLink: jest.fn().mockResolvedValue({ status: 'PAID', amount: 100000, amountPaid: 100000 }), cancelPaymentLink: jest.fn() };
    const cod = { settleOutstandingForWalletInTransaction: jest.fn() };
    return { topUp, store, prisma, repository, payOS, useCase: new HandleWalletTopUpWebhookUseCase(prisma as never, repository as never, payOS as never, cod as never) };
  }

  it.each(['FAILED', 'EXPIRED', 'CANCELLED'])('settles late signed success from %s exactly once', async status => {
    const f = fixture(status);
    await f.useCase.execute(webhook());
    await f.useCase.execute(webhook());
    expect(f.topUp.status).toBe('PAID');
    expect(f.repository.executeTransactionInTransaction).toHaveBeenCalledTimes(1);
  });

  it('does not downgrade PAID for a stale cancellation response', async () => {
    const f = fixture();
    f.payOS.getPaymentLink.mockImplementation(async () => { f.topUp.status = 'PAID'; return { status: 'CANCELLED', amount: 100000, amountPaid: 0 }; });
    expect(await f.useCase.reconcileRecord({ ...f.topUp })).toBe('PAID');
    expect(f.topUp.status).toBe('PAID');
  });

  it('expires an overdue pending link only after successful provider reconciliation', async () => {
    const f = fixture();
    f.payOS.getPaymentLink.mockResolvedValue({ status: 'PENDING', amount: 100000, amountPaid: 0 });
    expect(await f.useCase.reconcileRecord(f.topUp)).toBe('EXPIRED');
    expect(f.repository.executeTransactionInTransaction).not.toHaveBeenCalled();
  });

  it('keeps data unchanged when the provider is unavailable', async () => {
    const f = fixture(); f.payOS.getPaymentLink.mockRejectedValue(new Error('offline'));
    await expect(f.useCase.reconcileRecord(f.topUp)).rejects.toThrow('offline');
    expect(f.store.updateMany).not.toHaveBeenCalled();
  });

  it('settles payment that wins a simultaneous cancellation', async () => {
    const f = fixture(); f.payOS.cancelPaymentLink.mockResolvedValue({ status: 'PAID', amount: 100000, amountPaid: 100000 });
    expect(await f.useCase.reconcileRecord(f.topUp, true)).toBe('PAID');
    expect(f.repository.executeTransactionInTransaction).toHaveBeenCalledTimes(1);
  });

  it('retries serialization conflict without duplicating settlement', async () => {
    const f = fixture(); f.prisma.$transaction.mockRejectedValueOnce({ code: 'P2034' });
    await f.useCase.execute(webhook());
    expect(f.prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(f.repository.executeTransactionInTransaction).toHaveBeenCalledTimes(1);
  });

  it('checks shop authorization and destination before accessing provider', async () => {
    const f = fixture(); f.repository.canAccessShopWallet.mockResolvedValue(false);
    await expect(f.useCase.reconcile({ userId: 'attacker', shopId: 'shop-1', paymentLinkId: 'link-1' })).rejects.toThrow('cannot access');
    expect(f.payOS.getPaymentLink).not.toHaveBeenCalled();
  });

  it('reconciles an authorized shop using shop wallet ownership', async () => {
    const f = fixture();
    await expect(f.useCase.reconcile({ userId: 'owner', shopId: 'shop-1', paymentLinkId: 'link-1' })).resolves.toMatchObject({ status: 'PAID' });
    expect(f.store.findFirst).toHaveBeenCalledWith({ where: { paymentLinkId: 'link-1', wallet: { shopId: 'shop-1' } } });
  });

  it('rejects amount mismatch and missing webhook amount without ledger changes', async () => {
    const f = fixture();
    await expect(f.useCase.execute(webhook({ amount: undefined }))).rejects.toThrow();
    f.payOS.getPaymentLink.mockResolvedValue({ status: 'PAID', amount: 100000, amountPaid: 90000 });
    await expect(f.useCase.reconcileRecord(f.topUp)).rejects.toThrow('paid amount mismatch');
    expect(f.repository.executeTransactionInTransaction).not.toHaveBeenCalled();
  });
});
