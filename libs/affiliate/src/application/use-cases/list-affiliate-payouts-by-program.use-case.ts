import { Injectable, NotFoundException } from '@nestjs/common';
import { AffiliateRepository } from '../../infrastructure/persistence/affiliate.repository';
import { toAffiliatePayoutResponse } from './affiliate.mapper';

@Injectable()
export class ListAffiliatePayoutsByProgramUseCase {
  constructor(private readonly repository: AffiliateRepository) {}

  async execute(input: { requesterUserId: string; programId: string }) {
    const program = await this.repository.findOwnedProgramById(input.programId, input.requesterUserId);
    if (!program) {
      throw new NotFoundException('Affiliate program not found or not owned by current user');
    }

    const payouts = await this.repository.findPayoutsByProgram(input.programId);
    return payouts.map(toAffiliatePayoutResponse);
  }
}
