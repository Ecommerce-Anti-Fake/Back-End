import { Injectable, Logger } from '@nestjs/common';
import {
  Prisma,
  WalletBalanceType,
  WalletEntryDirection,
  WalletTransactionType,
} from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';
import { WalletRepository } from '@wallet';

@Injectable()
export class SettleMatureAffiliateCommissionsUseCase {
  private readonly logger = new Logger(SettleMatureAffiliateCommissionsUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletRepository: WalletRepository,
  ) {}

  async execute(now = new Date()) {
    const candidates = await this.prisma.affiliateCommissionLedger.findMany({
      where: {
        commissionStatus: 'LOCKED',
        amount: { gt: 0 },
        payoutId: null,
        availableAt: { lte: now },
        beneficiaryAccountId: { not: null },
        conversion: {
          conversionStatus: 'APPROVED',
          program: { settlementMode: 'AUTOMATIC', ownerShopId: { not: null } },
          order: { disputes: { none: { disputeStatus: 'OPEN' } } },
        },
      },
      select: { id: true },
      orderBy: [{ availableAt: 'asc' }, { createdAt: 'asc' }],
      take: 100,
    });

    let paid = 0;
    let failed = 0;
    for (const candidate of candidates) {
      try {
        if (await this.settleOne(candidate.id, now)) paid += 1;
      } catch (error) {
        failed += 1;
        this.logger.error(
          `Automatic affiliate settlement failed for commission ${candidate.id}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    return { scanned: candidates.length, paid, failed };
  }

  private settleOne(commissionId: string, now: Date) {
    return this.prisma.$transaction(
      async (tx) => {
        const commission = await tx.affiliateCommissionLedger.findUnique({
          where: { id: commissionId },
          include: {
            beneficiaryAccount: { select: { userId: true } },
            conversion: {
              include: {
                order: { select: { disputes: { where: { disputeStatus: 'OPEN' }, select: { id: true } } } },
                program: { select: { ownerShopId: true, settlementMode: true } },
              },
            },
          },
        });

        if (
          !commission ||
          commission.commissionStatus !== 'LOCKED' ||
          commission.payoutId ||
          !commission.availableAt ||
          commission.availableAt > now ||
          !commission.beneficiaryAccount ||
          commission.conversion.conversionStatus !== 'APPROVED' ||
          commission.conversion.program.settlementMode !== 'AUTOMATIC' ||
          !commission.conversion.program.ownerShopId ||
          commission.amount.lte(0) ||
          commission.conversion.order?.disputes.length
        ) {
          return false;
        }

        const payout = await tx.affiliatePayout.upsert({
          where: { idempotencyKey: `AUTO:${commission.id}` },
          update: {},
          create: {
            programId: commission.conversion.programId,
            accountId: commission.beneficiaryAccountId!,
            periodStart: commission.createdAt,
            periodEnd: now,
            totalAmount: commission.amount,
            currency: commission.currency,
            payoutStatus: 'PROCESSING',
            idempotencyKey: `AUTO:${commission.id}`,
          },
        });

        const claimed = await tx.affiliateCommissionLedger.updateMany({
          where: { id: commission.id, commissionStatus: 'LOCKED', payoutId: null },
          data: { payoutId: payout.id },
        });
        if (claimed.count !== 1) return false;

        const shopWallet = await this.walletRepository.findOrCreateShopWalletInTransaction(
          tx,
          commission.conversion.program.ownerShopId,
          commission.currency,
        );
        const affiliateWallet = await this.walletRepository.findOrCreateUserWalletInTransaction(
          tx,
          commission.beneficiaryAccount.userId,
          commission.currency,
        );

        await this.walletRepository.executeTransactionInTransaction(tx, {
          transactionCode: `AFFILIATE_COMMISSION:${commission.id}`,
          transactionType: WalletTransactionType.AFFILIATE_COMMISSION,
          idempotencyKey: `AFFILIATE_LEDGER:${commission.id}:CREDIT`,
          amount: commission.amount,
          currency: commission.currency,
          referenceType: 'AFFILIATE_COMMISSION',
          referenceId: commission.id,
          description: `Pay automatic affiliate commission ${commission.id}`,
          entries: [
            {
              walletId: shopWallet.id,
              direction: WalletEntryDirection.DEBIT,
              balanceType: WalletBalanceType.LOCKED,
              amount: commission.amount,
            },
            {
              walletId: affiliateWallet.id,
              direction: WalletEntryDirection.CREDIT,
              balanceType: WalletBalanceType.AVAILABLE,
              amount: commission.amount,
            },
          ],
        });

        await tx.affiliateCommissionLedger.update({
          where: { id: commission.id },
          data: { commissionStatus: 'PAID', paidAt: now },
        });
        await tx.affiliatePayout.update({
          where: { id: payout.id },
          data: { payoutStatus: 'PAID', paidAt: now },
        });
        return true;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}
