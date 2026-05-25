import { AffiliateRepository } from './affiliate.repository';

describe('AffiliateRepository', () => {
  it('should audit payout status changes', async () => {
    const payout = {
      id: 'payout-1',
      payoutStatus: 'PROCESSING',
    };
    const tx = {
      affiliatePayout: {
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
});
