import { Prisma } from '@prisma/client';
import { AdjustWalletBalanceUseCase } from './adjust-wallet-balance.use-case';

describe('AdjustWalletBalanceUseCase', () => {
  it('creates an adjustment ledger entry and audit atomically', async () => {
    const tx = {
      wallet: { findUnique: jest.fn().mockResolvedValue({ id: 'wallet-1', availableBalance: new Prisma.Decimal(10) }) },
      auditLog: { create: jest.fn() },
    };
    const prisma = { $transaction: jest.fn((callback) => callback(tx)) };
    const walletRepository = { executeTransactionInTransaction: jest.fn().mockResolvedValue({ id: 'tx-1' }) };
    const result = await new AdjustWalletBalanceUseCase(prisma as never, walletRepository as never).execute({
      walletId: 'wallet-1', adminUserId: 'admin-1', direction: 'CREDIT', balanceType: 'AVAILABLE', amount: '100000', reason: 'Điều chỉnh sau đối soát',
    });
    expect(result).toEqual({ success: true, message: 'Điều chỉnh số dư ví thành công.' });
    expect(walletRepository.executeTransactionInTransaction).toHaveBeenCalledWith(tx, expect.objectContaining({ transactionType: 'ADJUSTMENT', referenceId: 'wallet-1' }));
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ actorUserId: 'admin-1', targetId: 'wallet-1' }) }));
  });

  it('rejects zero or negative amounts before changing the wallet', async () => {
    const prisma = { $transaction: jest.fn() };
    const walletRepository = { executeTransactionInTransaction: jest.fn() };
    expect(() => new AdjustWalletBalanceUseCase(prisma as never, walletRepository as never).execute({
      walletId: 'wallet-1', adminUserId: 'admin-1', direction: 'DEBIT', balanceType: 'AVAILABLE', amount: '0', reason: 'test',
    })).toThrow('Amount must be greater than zero');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
