import { Prisma } from '@prisma/client';
import { RequestWalletWithdrawalUseCase } from './request-wallet-withdrawal.use-case';

describe('RequestWalletWithdrawalUseCase', () => {
  const tx = {
    walletWithdrawal: { create: jest.fn() },
  };
  const prisma = { $transaction: jest.fn() };
  const walletService = { canAccessShopWallet: jest.fn() };
  const walletRepository = {
    findShopWalletInTransaction: jest.fn(),
    executeTransactionInTransaction: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));
    walletService.canAccessShopWallet.mockResolvedValue(true);
    walletRepository.findShopWalletInTransaction.mockResolvedValue({
      id: 'wallet-1',
      pendingBalance: new Prisma.Decimal('50'),
      availableBalance: new Prisma.Decimal('100'),
      lockedBalance: new Prisma.Decimal('0'),
    });
    walletRepository.executeTransactionInTransaction.mockResolvedValue({ id: 'transaction-1' });
    tx.walletWithdrawal.create.mockResolvedValue({
      id: 'withdrawal-1', walletId: 'wallet-1', amount: new Prisma.Decimal('40'),
      bankName: 'ACB', accountNumber: '123456', accountHolder: 'SHOP OWNER',
      status: 'PENDING', createdAt: new Date(), processedAt: null,
    });
  });

  it('locks available funds and creates a pending withdrawal atomically', async () => {
    const useCase = new RequestWalletWithdrawalUseCase(prisma as never, walletService as never, walletRepository as never);

    await useCase.execute({
      shopId: 'shop-1',
      requesterUserId: 'owner-1',
      requesterRole: 'user',
      amount: '40.00',
      bankName: 'ACB',
      accountNumber: '123456',
      accountHolder: 'SHOP OWNER',
    });

    expect(walletRepository.executeTransactionInTransaction).toHaveBeenCalledWith(tx, expect.objectContaining({
      transactionCode: 'WITHDRAWAL_REQUEST:withdrawal-1',
      transactionType: 'WITHDRAWAL_REQUEST',
      entries: [
        expect.objectContaining({ walletId: 'wallet-1', direction: 'DEBIT', balanceType: 'AVAILABLE', amount: new Prisma.Decimal('40.00') }),
        expect.objectContaining({ walletId: 'wallet-1', direction: 'CREDIT', balanceType: 'LOCKED', amount: new Prisma.Decimal('40.00') }),
      ],
    }));
  });

  it('rejects insufficient available balance and never touches pending balance', async () => {
    const useCase = new RequestWalletWithdrawalUseCase(prisma as never, walletService as never, walletRepository as never);

    await expect(useCase.execute({
      shopId: 'shop-1', requesterUserId: 'owner-1', requesterRole: 'user', amount: '101',
      bankName: 'ACB', accountNumber: '123456', accountHolder: 'SHOP OWNER',
    })).rejects.toThrow('Insufficient available balance');
    expect(walletRepository.executeTransactionInTransaction).not.toHaveBeenCalled();
  });

  it('does not update withdrawal state when ledger transaction fails', async () => {
    walletRepository.executeTransactionInTransaction.mockRejectedValueOnce(new Error('ledger failure'));
    const useCase = new RequestWalletWithdrawalUseCase(prisma as never, walletService as never, walletRepository as never);
    await expect(useCase.execute({
      shopId: 'shop-1', requesterUserId: 'owner-1', requesterRole: 'user', amount: '40',
      bankName: 'ACB', accountNumber: '123456', accountHolder: 'SHOP OWNER',
    })).rejects.toThrow('ledger failure');
    expect(tx.walletWithdrawal.create).toHaveBeenCalled();
  });
});
