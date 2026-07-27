import { ForbiddenException } from '@nestjs/common';
import { Prisma, WalletOwnerType, WalletStatus } from '@prisma/client';
import { GetShopWalletUseCase } from './get-shop-wallet.use-case';

describe('GetShopWalletUseCase', () => {
  it('rejects a user who does not own the shop', async () => {
    const walletService = {
      canAccessShopWallet: jest.fn().mockResolvedValue(false),
      findOrCreateShopWallet: jest.fn(),
    } as any;
    const useCase = new GetShopWalletUseCase(walletService, {} as never);

    await expect(
      useCase.execute('shop-1', 'user-1', 'user'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(walletService.findOrCreateShopWallet).not.toHaveBeenCalled();
  });

  it('returns an owner shop wallet with Decimal balances mapped to strings', async () => {
    const walletService = {
      canAccessShopWallet: jest.fn().mockResolvedValue(true),
      findOrCreateShopWallet: jest.fn().mockResolvedValue({
        id: 'wallet-1',
        walletCode: 'shop_shop-1_vnd',
        ownerType: WalletOwnerType.SHOP,
        userId: null,
        shopId: 'shop-1',
        platformCode: null,
        currency: 'VND',
        availableBalance: new Prisma.Decimal('12.5'),
        pendingBalance: new Prisma.Decimal(0),
        lockedBalance: new Prisma.Decimal(0),
        status: WalletStatus.ACTIVE,
        version: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    } as any;
    const codSettlement = {
      getShopSummary: jest.fn().mockResolvedValue({
        codAmountDue: '25000.00',
        hasCodDebt: true,
        hasOverdueCodDebt: false,
        nextCodDebtDueAt: new Date('2026-07-30T06:00:00.000Z'),
      }),
    };
    const result = await new GetShopWalletUseCase(walletService, codSettlement as never).execute(
      'shop-1',
      'owner-1',
      'user',
    );
    expect(result.availableBalance).toBe('12.50');
    expect(result).toMatchObject({
      codAmountDue: '25000.00',
      hasCodDebt: true,
      hasOverdueCodDebt: false,
    });
  });
});
