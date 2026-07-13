import { Prisma } from '@prisma/client';
import { ApproveWalletWithdrawalUseCase } from './approve-wallet-withdrawal.use-case';
import { RejectWalletWithdrawalUseCase } from './reject-wallet-withdrawal.use-case';

describe('Process wallet withdrawal', () => {
  const tx = {
    walletWithdrawal: { findUnique: jest.fn(), update: jest.fn() },
  };
  const prisma = { $transaction: jest.fn() };
  const walletRepository = {
    findWithdrawalInTransaction: jest.fn(),
    executeTransactionInTransaction: jest.fn(),
  };
  const withdrawal = {
    id: 'withdrawal-1', walletId: 'wallet-1', amount: new Prisma.Decimal('40'), status: 'PENDING',
  };

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));
    tx.walletWithdrawal.findUnique.mockResolvedValue(withdrawal);
    walletRepository.findWithdrawalInTransaction.mockResolvedValue(withdrawal);
    tx.walletWithdrawal.update.mockResolvedValue({ ...withdrawal, status: 'COMPLETED' });
  });

  it('approves by debiting locked balance only', async () => {
    const useCase = new ApproveWalletWithdrawalUseCase(prisma as never, walletRepository as never);
    await expect(useCase.execute({ id: 'withdrawal-1' })).resolves.toEqual({
      success: true, message: 'Xử lý yêu cầu rút tiền thành công.',
    });
    expect(walletRepository.executeTransactionInTransaction).toHaveBeenCalledWith(tx, expect.objectContaining({
      transactionType: 'WITHDRAWAL', allowUnbalanced: true,
      entries: [expect.objectContaining({ walletId: 'wallet-1', direction: 'DEBIT', balanceType: 'LOCKED' })],
    }));
    expect(tx.walletWithdrawal.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'withdrawal-1' }, data: { status: 'COMPLETED', processedAt: expect.any(Date) },
    }));
  });

  it('rejects by moving locked balance back to available', async () => {
    const useCase = new RejectWalletWithdrawalUseCase(prisma as never, walletRepository as never);
    await expect(useCase.execute({ id: 'withdrawal-1' })).resolves.toEqual({
      success: true, message: 'Xử lý yêu cầu rút tiền thành công.',
    });
    expect(walletRepository.executeTransactionInTransaction).toHaveBeenCalledWith(tx, expect.objectContaining({
      transactionType: 'WITHDRAWAL',
      entries: expect.arrayContaining([
        expect.objectContaining({ direction: 'DEBIT', balanceType: 'LOCKED' }),
        expect.objectContaining({ direction: 'CREDIT', balanceType: 'AVAILABLE' }),
      ]),
    }));
  });

  it('rejects already processed withdrawals', async () => {
    walletRepository.findWithdrawalInTransaction.mockResolvedValueOnce({ ...withdrawal, status: 'REJECTED' });
    const useCase = new ApproveWalletWithdrawalUseCase(prisma as never, walletRepository as never);
    await expect(useCase.execute({ id: 'withdrawal-1' })).rejects.toThrow('Withdrawal is not pending');
    expect(walletRepository.executeTransactionInTransaction).not.toHaveBeenCalled();
  });
});
