import { BadRequestException, Injectable } from '@nestjs/common';
import { AffiliateRepository } from '../../infrastructure/persistence/affiliate.repository';
import { toAffiliatePayoutResponse } from './affiliate.mapper';

@Injectable()
export class ListAffiliatePayoutsByAccountUseCase {
  constructor(private readonly repository: AffiliateRepository) {}

  async execute(input: { requesterUserId: string; accountId: string }) {
    const account = await this.repository.findOwnedAffiliateAccount(input.accountId, input.requesterUserId);
    if (!account) {
      throw new BadRequestException('Affiliate account is invalid or not owned by current user');
    }

    const payouts = await this.repository.findPayoutsByAccount(input.accountId);
    return payouts.map(toAffiliatePayoutResponse);
  }
}
