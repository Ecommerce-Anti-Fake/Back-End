import { Injectable, NotFoundException } from '@nestjs/common';
import { AffiliateRepository } from '../../infrastructure/persistence/affiliate.repository';

type CommissionStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'LOCKED'
  | 'PAID'
  | 'CANCELLED';

@Injectable()
export class ListAffiliateProgramCommissionsUseCase {
  constructor(private readonly repository: AffiliateRepository) {}

  async execute(input: {
    requesterUserId: string;
    programId: string;
    page: number;
    pageSize: number;
    status?: CommissionStatus;
    tierLevel?: 1 | 2;
  }) {
    const program = await this.repository.findOwnedProgramById(
      input.programId,
      input.requesterUserId,
    );
    if (!program) {
      throw new NotFoundException('Affiliate program not found');
    }

    const query = {
      programId: input.programId,
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      status: input.status,
      tierLevel: input.tierLevel,
    };
    const [entries, total] = await Promise.all([
      this.repository.findProgramCommissionEntries(query),
      this.repository.countProgramCommissionEntries(query),
    ]);

    return {
      items: entries.map((entry) => ({
        id: entry.id,
        conversionId: entry.conversionId,
        orderId: entry.conversion.orderId,
        memberAccountId: entry.beneficiaryAccountId,
        memberDisplayName:
          entry.beneficiaryAccount?.user.displayName ?? 'Affiliate member',
        tierLevel: entry.tierLevel,
        amount: entry.amount.toString(),
        currency: entry.currency,
        commissionStatus: entry.commissionStatus,
        recordedAt: entry.conversion.recordedAt,
        approvedAt: entry.conversion.approvedAt,
        createdAt: entry.createdAt,
        lockedAt: entry.lockedAt,
        availableAt: entry.availableAt,
        paidAt: entry.paidAt,
        payoutId: entry.payoutId,
        payoutStatus: entry.payout?.payoutStatus ?? null,
        externalRef: entry.payout?.externalRef ?? null,
      })),
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages: Math.ceil(total / input.pageSize),
    };
  }
}
