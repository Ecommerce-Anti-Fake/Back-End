import { Prisma } from '@prisma/client';
import { ReconcileShopWalletUseCase } from './reconcile-shop-wallet.use-case';

describe('ReconcileShopWalletUseCase', () => {
  const tx = {
    wallet: { findUnique: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn(),
  };
  const walletRepository = {
    findShopWalletInTransaction: jest.fn(),
    executeTransactionInTransaction: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));
    walletRepository.findShopWalletInTransaction.mockResolvedValue({
      id: 'shop-wallet',
      shopId: 'shop-1',
      pendingBalance: new Prisma.Decimal('100'),
      availableBalance: new Prisma.Decimal('20'),
    });
  });

  it('moves the full pending balance to available in one shop wallet', async () => {
    const useCase = new ReconcileShopWalletUseCase(prisma as never, walletRepository as never);

    await useCase.execute({ shopId: 'shop-1' });

    expect(walletRepository.executeTransactionInTransaction).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        transactionCode: 'SETTLEMENT:shop-1:100.00',
        transactionType: 'SETTLEMENT',
        amount: new Prisma.Decimal('100'),
        entries: [
          expect.objectContaining({ walletId: 'shop-wallet', direction: 'DEBIT', balanceType: 'PENDING', amount: new Prisma.Decimal('100') }),
          expect.objectContaining({ walletId: 'shop-wallet', direction: 'CREDIT', balanceType: 'AVAILABLE', amount: new Prisma.Decimal('100') }),
        ],
      }),
    );
    expect(walletRepository.findShopWalletInTransaction).toHaveBeenCalledWith(tx, 'shop-1', 'VND');
  });

  it('supports partial reconciliation and rejects more than pending', async () => {
    const useCase = new ReconcileShopWalletUseCase(prisma as never, walletRepository as never);

    await useCase.execute({ shopId: 'shop-1', amount: new Prisma.Decimal('40') });
    expect(walletRepository.executeTransactionInTransaction.mock.calls[0][1].amount).toEqual(new Prisma.Decimal('40'));

    await expect(useCase.execute({ shopId: 'shop-1', amount: 101 })).rejects.toThrow('Settlement amount exceeds pending balance');
  });

  it('does not create a wallet when the shop wallet is missing', async () => {
    walletRepository.findShopWalletInTransaction.mockResolvedValueOnce(null);
    const useCase = new ReconcileShopWalletUseCase(prisma as never, walletRepository as never);

    await expect(useCase.execute({ shopId: 'shop-1' })).rejects.toThrow('Shop wallet not found');
    expect(walletRepository.executeTransactionInTransaction).not.toHaveBeenCalled();
  });
});
