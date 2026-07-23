import { Injectable, NotFoundException } from '@nestjs/common';
import { AffiliateRepository } from '../../infrastructure/persistence/affiliate.repository';

const COMMISSION_STATUSES = [
  'PENDING',
  'APPROVED',
  'LOCKED',
  'PAID',
  'CANCELLED',
] as const;

@Injectable()
export class GetSellerAffiliateSummaryUseCase {
  constructor(private readonly repository: AffiliateRepository) {}

  async execute(input: {
    requesterUserId: string;
    programId?: string | null;
  }) {
    if (input.programId) {
      const program = await this.repository.findOwnedProgramById(
        input.programId,
        input.requesterUserId,
      );
      if (!program) {
        throw new NotFoundException('Affiliate program not found');
      }
    }

    const summary = await this.repository.getSellerAffiliateSummary(
      input.requesterUserId,
      input.programId ?? null,
    );
    const totals = new Map(
      summary.commissionTotals.map((item) => [
        item.commissionStatus,
        item.amount.toString(),
      ]),
    );

    return {
      programCount: summary.programCount,
      activeProgramCount: summary.activeProgramCount,
      memberCount: summary.memberCount,
      conversionCount: summary.conversionCount,
      pendingCommissionAmount: totals.get(COMMISSION_STATUSES[0]) ?? '0',
      approvedCommissionAmount: totals.get(COMMISSION_STATUSES[1]) ?? '0',
      lockedCommissionAmount: totals.get(COMMISSION_STATUSES[2]) ?? '0',
      paidCommissionAmount: totals.get(COMMISSION_STATUSES[3]) ?? '0',
      cancelledCommissionAmount: totals.get(COMMISSION_STATUSES[4]) ?? '0',
      currency: 'VND',
    };
  }
}
