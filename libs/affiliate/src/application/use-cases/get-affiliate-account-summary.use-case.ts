import { BadRequestException, Injectable } from '@nestjs/common';
import { AffiliateRepository } from '../../infrastructure/persistence/affiliate.repository';

@Injectable()
export class GetAffiliateAccountSummaryUseCase {
  constructor(private readonly repository: AffiliateRepository) {}

  async execute(input: { requesterUserId: string; accountId: string }) {
    const account = await this.repository.findOwnedAffiliateAccount(input.accountId, input.requesterUserId);
    if (!account) {
      throw new BadRequestException('Affiliate account is invalid or not owned by current user');
    }

    const summary = await this.repository.getAffiliateAccountSummary(input.accountId);
    const conversions = summary.conversions;
    const commissionEntries = summary.commissionEntries;

    return {
      accountId: input.accountId,
      programId: account.programId,
      programName: account.program.name,
      totalConversions: conversions.length,
      totalTier1Conversions: conversions.filter((item) => item.tier1AccountId === input.accountId).length,
      totalTier2Conversions: conversions.filter((item) => item.tier2AccountId === input.accountId).length,
      totalCommissionAmount: this.sumByStatus(commissionEntries),
      pendingCommissionAmount: this.sumByStatus(commissionEntries, 'PENDING'),
      approvedCommissionAmount: this.sumByStatus(commissionEntries, 'APPROVED'),
      lockedCommissionAmount: this.sumByStatus(commissionEntries, 'LOCKED'),
      paidCommissionAmount: this.sumByStatus(commissionEntries, 'PAID'),
      cancelledCommissionAmount: this.sumByStatus(commissionEntries, 'CANCELLED'),
    };
  }

  private sumByStatus(
    entries: Array<{ amount: { toString(): string }; commissionStatus: string }>,
    status?: 'PENDING' | 'APPROVED' | 'LOCKED' | 'PAID' | 'CANCELLED',
  ) {
    return entries
      .filter((entry) => !status || entry.commissionStatus === status)
      .reduce((sum, entry) => sum + Number(entry.amount.toString()), 0);
  }
}
