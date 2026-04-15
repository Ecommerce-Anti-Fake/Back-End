import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AffiliateRepository } from '../../infrastructure/persistence/affiliate.repository';
import { toAffiliatePayoutResponse } from './affiliate.mapper';

@Injectable()
export class UpdateAffiliatePayoutStatusUseCase {
  constructor(private readonly repository: AffiliateRepository) {}

  async execute(input: {
    requesterUserId: string;
    payoutId: string;
    payoutStatus: 'PROCESSING' | 'PAID' | 'FAILED' | 'CANCELLED';
  }) {
    const payout = await this.repository.findOwnedPayoutById(input.payoutId, input.requesterUserId);
    if (!payout) {
      throw new NotFoundException('Affiliate payout not found or not owned by current user');
    }

    if (payout.payoutStatus === 'PAID' || payout.payoutStatus === 'CANCELLED') {
      throw new BadRequestException('Terminal payout status cannot be changed');
    }

    const updated = await this.repository.updatePayoutStatus({
      payoutId: input.payoutId,
      payoutStatus: input.payoutStatus,
    });

    return toAffiliatePayoutResponse(updated);
  }
}
