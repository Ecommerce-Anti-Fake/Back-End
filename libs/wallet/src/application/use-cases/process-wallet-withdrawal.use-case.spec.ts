import { Prisma } from '@prisma/client';
import { ApproveWalletWithdrawalUseCase } from './approve-wallet-withdrawal.use-case';
import { CompleteWalletWithdrawalUseCase } from './complete-wallet-withdrawal.use-case';
import { CancelWalletWithdrawalUseCase } from './cancel-wallet-withdrawal.use-case';
import { RejectWalletWithdrawalUseCase } from './reject-wallet-withdrawal.use-case';

describe('Process wallet withdrawal', () => {
  const tx = {
    walletWithdrawal: { update: jest.fn() },
  };
  const prisma = { $transaction: jest.fn() };
  const walletRepository = {
    findWithdrawalInTransaction: jest.fn(),
    findShopWalletInTransaction: jest.fn(),
    executeTransactionInTransaction: jest.fn(),
  };
  const walletService = { canAccessShopWallet: jest.fn() };
  const withdrawal = {
    id: 'withdrawal-1', walletId: 'wallet-1', amount: new Prisma.Decimal('40'), status: 'PENDING',
  };

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));
    walletRepository.findWithdrawalInTransaction.mockResolvedValue(withdrawal);
    walletRepository.findShopWalletInTransaction.mockResolvedValue({ id: 'wallet-1' });
    walletRepository.executeTransactionInTransaction.mockResolvedValue({ id: 'transaction-1' });
    walletService.canAccessShopWallet.mockResolvedValue(true);
    tx.walletWithdrawal.update.mockResolvedValue({ ...withdrawal, status: 'APPROVED' });
  });

  it('approves without moving locked funds', async () => {
    const useCase = new ApproveWalletWithdrawalUseCase(prisma as never, walletRepository as never);

    await expect(useCase.execute({ id: 'withdrawal-1' })).resolves.toEqual({
      success: true, message: 'Đã duyệt yêu cầu rút tiền.',
    });
    expect(walletRepository.executeTransactionInTransaction).not.toHaveBeenCalled();
    expect(tx.walletWithdrawal.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'withdrawal-1' }, data: { status: 'APPROVED', approvedAt: expect.any(Date) },
    }));
  });

  it('completes an approved withdrawal only after recording the bank transfer reference', async () => {
    walletRepository.findWithdrawalInTransaction.mockResolvedValueOnce({ ...withdrawal, status: 'APPROVED' });
    const useCase = new CompleteWalletWithdrawalUseCase(prisma as never, walletRepository as never);

    await expect(useCase.execute({ id: 'withdrawal-1', transferReference: 'VCB-20260722-001' })).resolves.toEqual({
      success: true, message: 'Đã ghi nhận chuyển khoản và hoàn tất yêu cầu rút tiền.',
    });
    expect(walletRepository.executeTransactionInTransaction).toHaveBeenCalledWith(tx, expect.objectContaining({
      transactionType: 'WITHDRAWAL', allowUnbalanced: true,
      entries: [expect.objectContaining({ walletId: 'wallet-1', direction: 'DEBIT', balanceType: 'LOCKED' })],
    }));
    expect(tx.walletWithdrawal.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'withdrawal-1' },
      data: expect.objectContaining({ status: 'COMPLETED', transferReference: 'VCB-20260722-001', completedAt: expect.any(Date) }),
    }));
  });

  it('does not complete a pending withdrawal', async () => {
    const useCase = new CompleteWalletWithdrawalUseCase(prisma as never, walletRepository as never);

    await expect(useCase.execute({ id: 'withdrawal-1', transferReference: 'REF-1' })).rejects.toThrow(
      'Withdrawal is not approved',
    );
    expect(walletRepository.executeTransactionInTransaction).not.toHaveBeenCalled();
  });

  it('rejects by moving locked balance back to available', async () => {
    const useCase = new RejectWalletWithdrawalUseCase(prisma as never, walletRepository as never);

    await expect(useCase.execute({ id: 'withdrawal-1', reason: 'Thông tin không hợp lệ' })).resolves.toEqual({
      success: true, message: 'Đã từ chối yêu cầu rút tiền và hoàn lại số dư khả dụng.',
    });
    expect(walletRepository.executeTransactionInTransaction).toHaveBeenCalledWith(tx, expect.objectContaining({
      transactionType: 'WITHDRAWAL',
      entries: expect.arrayContaining([
        expect.objectContaining({ direction: 'DEBIT', balanceType: 'LOCKED' }),
        expect.objectContaining({ direction: 'CREDIT', balanceType: 'AVAILABLE' }),
      ]),
    }));
    expect(tx.walletWithdrawal.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'REJECTED', rejectionReason: 'Thông tin không hợp lệ' }),
    }));
  });

  it('allows the shop owner to cancel a pending request and unlocks funds once', async () => {
    const useCase = new CancelWalletWithdrawalUseCase(prisma as never, walletService as never, walletRepository as never);

    await expect(useCase.execute({
      id: 'withdrawal-1', shopId: 'shop-1', requesterUserId: 'owner-1', requesterRole: 'user',
    })).resolves.toEqual({ success: true, message: 'Đã hủy yêu cầu rút tiền và hoàn lại số dư khả dụng.' });
    expect(walletRepository.executeTransactionInTransaction).toHaveBeenCalledWith(tx, expect.objectContaining({
      idempotencyKey: 'WITHDRAWAL:withdrawal-1:CANCEL',
      entries: expect.arrayContaining([
        expect.objectContaining({ direction: 'DEBIT', balanceType: 'LOCKED' }),
        expect.objectContaining({ direction: 'CREDIT', balanceType: 'AVAILABLE' }),
      ]),
    }));
    expect(tx.walletWithdrawal.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'CANCELLED', cancelledAt: expect.any(Date) }),
    }));
  });

  it('does not let one shop cancel another shop withdrawal by id', async () => {
    walletRepository.findShopWalletInTransaction.mockResolvedValueOnce({ id: 'wallet-other' });
    const useCase = new CancelWalletWithdrawalUseCase(
      prisma as never,
      walletService as never,
      walletRepository as never,
    );

    await expect(useCase.execute({
      id: 'withdrawal-1',
      shopId: 'shop-other',
      requesterUserId: 'owner-other',
      requesterRole: 'user',
    })).rejects.toThrow('Withdrawal does not belong to this shop wallet');
    expect(walletRepository.executeTransactionInTransaction).not.toHaveBeenCalled();
  });

  it('rejects already processed withdrawals', async () => {
    walletRepository.findWithdrawalInTransaction.mockResolvedValueOnce({ ...withdrawal, status: 'REJECTED' });
    const useCase = new ApproveWalletWithdrawalUseCase(prisma as never, walletRepository as never);

    await expect(useCase.execute({ id: 'withdrawal-1' })).rejects.toThrow('Withdrawal is not pending');
    expect(walletRepository.executeTransactionInTransaction).not.toHaveBeenCalled();
  });

  it('allows only one concurrent completion to commit when the second wallet update conflicts', async () => {
    walletRepository.findWithdrawalInTransaction.mockResolvedValue({ ...withdrawal, status: 'APPROVED' });
    walletRepository.executeTransactionInTransaction
      .mockResolvedValueOnce({ id: 'tx-1' })
      .mockRejectedValueOnce(new Error('WALLET_CONCURRENT_UPDATE'));
    const useCase = new CompleteWalletWithdrawalUseCase(prisma as never, walletRepository as never);

    const results = await Promise.allSettled([
      useCase.execute({ id: 'withdrawal-1', transferReference: 'REF-1' }),
      useCase.execute({ id: 'withdrawal-1', transferReference: 'REF-1' }),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
  });
});
