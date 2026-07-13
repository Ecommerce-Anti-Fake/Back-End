import { Prisma, WalletOwnerType, WalletStatus } from '@prisma/client';
import { toWalletResponse } from './wallet.mapper';

describe('toWalletResponse', () => {
  it('serializes wallet Decimal balances as strings', () => {
    const response = toWalletResponse({
      id: 'wallet-1',
      walletCode: 'user_1_vnd',
      ownerType: WalletOwnerType.USER,
      userId: 'user-1',
      shopId: null,
      platformCode: null,
      currency: 'VND',
      availableBalance: new Prisma.Decimal('10.5'),
      pendingBalance: new Prisma.Decimal('0'),
      lockedBalance: new Prisma.Decimal('2.25'),
      status: WalletStatus.ACTIVE,
      version: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(response.availableBalance).toBe('10.50');
    expect(response.lockedBalance).toBe('2.25');
  });
});
