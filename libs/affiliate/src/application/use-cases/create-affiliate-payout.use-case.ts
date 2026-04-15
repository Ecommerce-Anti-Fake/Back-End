import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AffiliateRepository } from '../../infrastructure/persistence/affiliate.repository';
import { toAffiliatePayoutResponse } from './affiliate.mapper';

@Injectable()
export class CreateAffiliatePayoutUseCase {
  constructor(private readonly repository: AffiliateRepository) {}

  async execute(input: {
    requesterUserId: string;
    programId: string;
    accountId: string;
    periodStart: string;
    periodEnd: string;
    externalRef?: string | null;
  }) {
    const program = await this.repository.findOwnedProgramById(input.programId, input.requesterUserId);
    if (!program) {
      throw new NotFoundException('Affiliate program not found or not owned by current user');
    }

    const account = await this.repository.findOwnedAccountInProgram(input.accountId, input.programId, input.requesterUserId);
    if (!account) {
      throw new BadRequestException('Affiliate account is invalid for this program');
    }

    const periodStart = this.parseDate(input.periodStart, 'periodStart');
    const periodEnd = this.parseDate(input.periodEnd, 'periodEnd');
    if (periodStart > periodEnd) {
      throw new BadRequestException('periodStart must be earlier than periodEnd');
    }

    const ledgerEntries = await this.repository.findApprovedLedgerEntriesForPayout({
      programId: input.programId,
      accountId: input.accountId,
      periodStart,
      periodEnd,
    });

    if (ledgerEntries.length === 0) {
      throw new BadRequestException('No approved commission entries available for payout');
    }

    const totalAmount = ledgerEntries.reduce((sum, entry) => sum + Number(entry.amount.toString()), 0);
    const payout = await this.repository.createPayout({
      programId: input.programId,
      accountId: input.accountId,
      periodStart,
      periodEnd,
      totalAmount,
      externalRef: input.externalRef?.trim() || null,
      ledgerEntryIds: ledgerEntries.map((entry) => entry.id),
    });

    return toAffiliatePayoutResponse(payout);
  }

  private parseDate(value: string, fieldName: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${fieldName} has invalid datetime format`);
    }

    return date;
  }
}
