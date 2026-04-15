import { BadRequestException, Injectable } from '@nestjs/common';
import { AffiliateRepository } from '../../infrastructure/persistence/affiliate.repository';
import { toAffiliateCommissionEntryResponse } from './affiliate.mapper';

@Injectable()
export class ListAffiliateCommissionsByAccountUseCase {
  constructor(private readonly repository: AffiliateRepository) {}

  async execute(input: { requesterUserId: string; accountId: string }) {
    const account = await this.repository.findOwnedAffiliateAccount(input.accountId, input.requesterUserId);
    if (!account) {
      throw new BadRequestException('Affiliate account is invalid or not owned by current user');
    }

    const entries = await this.repository.findCommissionEntriesByAccount(input.accountId);
    return entries.map(toAffiliateCommissionEntryResponse);
  }
}
