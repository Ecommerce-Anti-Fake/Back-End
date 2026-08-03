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
});
