import { Prisma, WalletOwnerType, WalletStatus } from '@prisma/client';
import { toWalletLedgerResponse, toWalletResponse } from './wallet.mapper';

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

  it('returns only the frontend transaction fields with string Decimal amount', () => {
    const response = toWalletLedgerResponse({
      data: [
        {
          id: 'entry-1',
          walletId: 'wallet-1',
          transactionId: 'tx-1',
          direction: 'DEBIT',
          balanceType: 'AVAILABLE',
          amount: new Prisma.Decimal('200000'),
          balanceBefore: new Prisma.Decimal('500000'),
          balanceAfter: new Prisma.Decimal('300000'),
          createdAt: new Date('2026-07-13T10:00:00.000Z'),
          transaction: {
            id: 'tx-1',
            transactionCode: 'TX001',
            transactionType: 'PAYMENT',
            status: 'COMPLETED',
            amount: new Prisma.Decimal('200000'),
            currency: 'VND',
            idempotencyKey: 'secret',
            referenceType: 'ORDER',
            referenceId: 'order-1',
            description: 'Thanh toán đơn hàng',
            createdAt: new Date(),
            completedAt: new Date(),
          },
        } as never,
      ],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    });
    expect(response).toEqual({
      items: [
        {
          transactionCode: 'TX001',
          transactionType: 'PAYMENT',
          status: 'COMPLETED',
          direction: 'DEBIT',
          balanceType: 'AVAILABLE',
          amount: '200000.00',
          description: 'Thanh toán đơn hàng',
          createdAt: new Date('2026-07-13T10:00:00.000Z'),
        },
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
  });
});
