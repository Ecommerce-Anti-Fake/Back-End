import { Prisma } from '@prisma/client';
import { ListUserWalletWithdrawalsUseCase } from './list-user-wallet-withdrawals.use-case';

describe('ListUserWalletWithdrawalsUseCase', () => {
  it('lists only withdrawals from the authenticated user wallet', async () => {
    const repository = {
      findUserWallet: jest.fn().mockResolvedValue({ id: 'wallet-user-1' }),
      listWithdrawals: jest.fn().mockResolvedValue([{
        id: 'withdrawal-1',
        payoutAccountId: 'payout-1',
        amount: new Prisma.Decimal('100000'),
        bankName: 'Vietcombank',
        accountNumberLast4: '6789',
        accountNumberLength: 10,
        accountNumber: null,
        accountHolder: 'TRAN VAN B',
        status: 'PENDING',
        transferReference: null,
        rejectionReason: null,
        createdAt: new Date('2026-07-27T05:00:00.000Z'),
        processedAt: null,
      }]),
    };
    const useCase = new ListUserWalletWithdrawalsUseCase(repository as never);

    await expect(useCase.execute({ userId: 'user-1' })).resolves.toEqual([
      expect.objectContaining({
        id: 'withdrawal-1',
        amount: '100000.00',
        accountNumberMasked: '******6789',
      }),
    ]);
    expect(repository.findUserWallet).toHaveBeenCalledWith('user-1', 'VND');
    expect(repository.listWithdrawals).toHaveBeenCalledWith('wallet-user-1');
  });

  it('returns an empty list before the user wallet exists', async () => {
    const repository = {
      findUserWallet: jest.fn().mockResolvedValue(null),
      listWithdrawals: jest.fn(),
    };
    const useCase = new ListUserWalletWithdrawalsUseCase(repository as never);

    await expect(useCase.execute({ userId: 'user-1' })).resolves.toEqual([]);
    expect(repository.listWithdrawals).not.toHaveBeenCalled();
  });
});
