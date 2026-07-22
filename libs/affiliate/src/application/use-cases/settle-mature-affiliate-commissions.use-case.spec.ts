import { Prisma } from '@prisma/client';
import { SettleMatureAffiliateCommissionsUseCase } from './settle-mature-affiliate-commissions.use-case';

describe('SettleMatureAffiliateCommissionsUseCase', () => {
  const tx = {
    affiliateCommissionLedger: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    affiliatePayout: { upsert: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const prisma = {
    affiliateCommissionLedger: { findMany: jest.fn() },
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
  };
  const walletRepository = {
    findOrCreateShopWalletInTransaction: jest.fn(),
    findOrCreateUserWalletInTransaction: jest.fn(),
    executeTransactionInTransaction: jest.fn(),
  };

  let useCase: SettleMatureAffiliateCommissionsUseCase;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));
    useCase = new SettleMatureAffiliateCommissionsUseCase(prisma as never, walletRepository as never);
    prisma.affiliateCommissionLedger.findMany.mockResolvedValue([{ id: 'commission-1' }]);
    tx.affiliateCommissionLedger.findUnique.mockResolvedValue({
      id: 'commission-1',
      conversionId: 'conversion-1',
      beneficiaryAccountId: 'account-1',
      amount: new Prisma.Decimal('8000'),
      currency: 'VND',
      commissionStatus: 'LOCKED',
      availableAt: new Date('2026-07-22T00:00:00.000Z'),
      createdAt: new Date('2026-07-01T00:00:00.000Z'),
      payoutId: null,
      beneficiaryAccount: { userId: 'affiliate-user-1' },
      conversion: {
        conversionStatus: 'APPROVED',
        programId: 'program-1',
        order: { disputes: [] },
        program: { ownerShopId: 'shop-1', settlementMode: 'AUTOMATIC' },
      },
    });
    tx.affiliatePayout.upsert.mockResolvedValue({ id: 'payout-1' });
    tx.affiliateCommissionLedger.updateMany.mockResolvedValue({ count: 1 });
    walletRepository.findOrCreateShopWalletInTransaction.mockResolvedValue({ id: 'shop-wallet' });
    walletRepository.findOrCreateUserWalletInTransaction.mockResolvedValue({ id: 'affiliate-wallet' });
  });

  it('moves a matured commission from the shop reserve to the affiliate wallet exactly once', async () => {
    const result = await useCase.execute(new Date('2026-07-23T00:00:00.000Z'));

    expect(walletRepository.executeTransactionInTransaction).toHaveBeenCalledWith(tx, expect.objectContaining({
      transactionCode: 'AFFILIATE_COMMISSION:commission-1',
      idempotencyKey: 'AFFILIATE_LEDGER:commission-1:CREDIT',
      referenceType: 'AFFILIATE_COMMISSION',
      referenceId: 'commission-1',
      amount: new Prisma.Decimal('8000'),
      entries: [
        expect.objectContaining({ walletId: 'shop-wallet', direction: 'DEBIT', balanceType: 'LOCKED' }),
        expect.objectContaining({ walletId: 'affiliate-wallet', direction: 'CREDIT', balanceType: 'AVAILABLE' }),
      ],
    }));
    expect(tx.affiliateCommissionLedger.update).toHaveBeenCalledWith({
      where: { id: 'commission-1' },
      data: { commissionStatus: 'PAID', paidAt: new Date('2026-07-23T00:00:00.000Z') },
    });
    expect(tx.affiliatePayout.update).toHaveBeenCalledWith({
      where: { id: 'payout-1' },
      data: { payoutStatus: 'PAID', paidAt: new Date('2026-07-23T00:00:00.000Z') },
    });
    expect(result).toEqual({ scanned: 1, paid: 1, failed: 0 });
    expect(prisma.affiliateCommissionLedger.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ amount: { gt: 0 } }),
      }),
    );
  });

  it('skips a commission already claimed by another worker', async () => {
    tx.affiliateCommissionLedger.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(useCase.execute(new Date('2026-07-23T00:00:00.000Z')))
      .resolves.toEqual({ scanned: 1, paid: 0, failed: 0 });

    expect(walletRepository.executeTransactionInTransaction).not.toHaveBeenCalled();
  });

  it('does not process a zero-value commission even if a stale row is selected', async () => {
    tx.affiliateCommissionLedger.findUnique.mockResolvedValueOnce({
      id: 'commission-1',
      conversionId: 'conversion-1',
      beneficiaryAccountId: 'account-1',
      amount: new Prisma.Decimal(0),
      currency: 'VND',
      commissionStatus: 'LOCKED',
      availableAt: new Date('2026-07-22T00:00:00.000Z'),
      createdAt: new Date('2026-07-01T00:00:00.000Z'),
      payoutId: null,
      beneficiaryAccount: { userId: 'affiliate-user-1' },
      conversion: {
        conversionStatus: 'APPROVED',
        programId: 'program-1',
        order: { disputes: [] },
        program: { ownerShopId: 'shop-1', settlementMode: 'AUTOMATIC' },
      },
    });

    await expect(useCase.execute(new Date('2026-07-23T00:00:00.000Z')))
      .resolves.toEqual({ scanned: 1, paid: 0, failed: 0 });

    expect(tx.affiliatePayout.upsert).not.toHaveBeenCalled();
    expect(walletRepository.executeTransactionInTransaction).not.toHaveBeenCalled();
  });

  it('continues with later candidates when one settlement transaction fails', async () => {
    prisma.affiliateCommissionLedger.findMany.mockResolvedValueOnce([
      { id: 'poison-commission' },
      { id: 'commission-1' },
    ]);
    prisma.$transaction
      .mockRejectedValueOnce(new Error('poison row'))
      .mockImplementationOnce((callback: (client: typeof tx) => unknown) => callback(tx));

    await expect(useCase.execute(new Date('2026-07-23T00:00:00.000Z')))
      .resolves.toEqual({ scanned: 2, paid: 1, failed: 1 });

    expect(walletRepository.executeTransactionInTransaction).toHaveBeenCalledTimes(1);
  });
});
