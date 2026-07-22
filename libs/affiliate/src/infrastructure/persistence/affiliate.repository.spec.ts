import { AffiliateRepository } from './affiliate.repository';
import { BadRequestException } from '@nestjs/common';

describe('AffiliateRepository', () => {
  it('atomically rejects a manual payout when another request claimed an entry', async () => {
    const tx = {
      affiliatePayout: { create: jest.fn().mockResolvedValue({ id: 'payout-1' }) },
      affiliateCommissionLedger: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };
    const prisma = { $transaction: jest.fn((callback) => callback(tx)) };
    const repository = new AffiliateRepository(prisma as never);

    await expect(repository.createPayout({
      programId: 'program-1',
      accountId: 'account-1',
      periodStart: new Date('2026-07-01T00:00:00.000Z'),
      periodEnd: new Date('2026-07-31T23:59:59.999Z'),
      totalAmount: 100,
      externalRef: null,
      ledgerEntryIds: ['commission-1'],
    })).rejects.toBeInstanceOf(BadRequestException);

    expect(tx.affiliateCommissionLedger.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ payoutId: null, commissionStatus: 'APPROVED' }),
    }));
  });

  it('should audit payout status changes', async () => {
    const payout = {
      id: 'payout-1',
      payoutStatus: 'PROCESSING',
    };
    const tx = {
      affiliatePayout: {
        findUnique: jest.fn().mockResolvedValue({
          account: { userId: 'affiliate-1' },
          commissionEntries: [],
        }),
        update: jest.fn().mockResolvedValue(payout),
      },
      affiliateCommissionLedger: {
        updateMany: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const repository = new AffiliateRepository(prisma as never);

    await expect(
      repository.updatePayoutStatus({
        payoutId: 'payout-1',
        actorUserId: 'owner-1',
        fromStatus: 'PENDING',
        payoutStatus: 'PROCESSING',
      }),
    ).resolves.toBe(payout);

    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        targetType: 'AFFILIATE_PAYOUT',
        targetId: 'payout-1',
        actorUserId: 'owner-1',
        action: 'AFFILIATE_PAYOUT_STATUS_CHANGED',
        fromStatus: 'PENDING',
        toStatus: 'PROCESSING',
      }),
    });
  });

  it('debits the owning shop available balance for a legacy manual payout', async () => {
    const payout = {
      id: 'payout-1',
      payoutStatus: 'PAID',
    };
    const tx = {
      affiliatePayout: {
        findUnique: jest.fn().mockResolvedValue({
          currency: 'VND',
          account: { userId: 'affiliate-1' },
          program: { ownerShopId: 'shop-1' },
          commissionEntries: [
            {
              id: 'commission-1',
              amount: 25000,
              commissionStatus: 'LOCKED',
              conversionId: 'conversion-1',
            },
          ],
        }),
        update: jest.fn().mockResolvedValue(payout),
      },
      affiliateCommissionLedger: { updateMany: jest.fn() },
      auditLog: { create: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const walletRepository = {
      findOrCreatePlatformWalletInTransaction: jest.fn(),
      findOrCreateShopWalletInTransaction: jest.fn().mockResolvedValue({ id: 'shop-wallet' }),
      findOrCreateUserWalletInTransaction: jest.fn().mockResolvedValue({ id: 'affiliate-wallet' }),
      executeTransactionInTransaction: jest.fn(),
    };
    const repository = new AffiliateRepository(prisma as never, walletRepository as never);

    await repository.updatePayoutStatus({
      payoutId: 'payout-1',
      actorUserId: 'owner-1',
      fromStatus: 'PROCESSING',
      payoutStatus: 'PAID',
    });

    expect(walletRepository.findOrCreatePlatformWalletInTransaction).not.toHaveBeenCalled();
    expect(walletRepository.findOrCreateShopWalletInTransaction).toHaveBeenCalledWith(tx, 'shop-1', 'VND');
    expect(walletRepository.executeTransactionInTransaction).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        entries: [
          expect.objectContaining({
            walletId: 'shop-wallet',
            direction: 'DEBIT',
            balanceType: 'AVAILABLE',
          }),
          expect.objectContaining({
            walletId: 'affiliate-wallet',
            direction: 'CREDIT',
            balanceType: 'AVAILABLE',
          }),
        ],
      }),
    );
  });
});
