import { Prisma } from '@prisma/client';
import { ListShopWalletWithdrawalsUseCase } from './list-shop-wallet-withdrawals.use-case';

describe('ListShopWalletWithdrawalsUseCase', () => {
  it('returns only frontend withdrawal fields with decimal strings', async () => {
    const useCase = new ListShopWalletWithdrawalsUseCase(
      { canAccessShopWallet: jest.fn().mockResolvedValue(true) } as never,
      {
        findShopWallet: jest.fn().mockResolvedValue({ id: 'wallet-1' }),
        listWithdrawals: jest.fn().mockResolvedValue([{
          id: 'withdrawal-1', walletId: 'wallet-1', amount: new Prisma.Decimal('40'),
          bankName: 'ACB', accountNumber: '123', accountHolder: 'A', status: 'PENDING',
          createdAt: new Date(), processedAt: null, version: 1, idempotencyKey: 'secret',
        }]),
      } as never,
    );

    const result = await useCase.execute({ shopId: 'shop-1', requesterUserId: 'user-1', requesterRole: 'user' });

    expect(result[0]).toEqual(expect.objectContaining({ id: 'withdrawal-1', amount: '40.00' }));
    expect(result[0]).not.toHaveProperty('walletId');
    expect(result[0]).not.toHaveProperty('idempotencyKey');
    expect(result[0]).not.toHaveProperty('version');
  });
});
