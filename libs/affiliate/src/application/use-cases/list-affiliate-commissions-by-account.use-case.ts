import { BadRequestException, Injectable } from '@nestjs/common';
import { AffiliateRepository } from '../../infrastructure/persistence/affiliate.repository';
import { toAffiliateCommissionEntryResponse } from './affiliate.mapper';

@Injectable()
export class ListAffiliateCommissionsByAccountUseCase {
  constructor(private readonly repository: AffiliateRepository) {}

  async execute(input: { requesterUserId: string; accountId: string; page: number; pageSize: number }) {
    const account = await this.repository.findOwnedAffiliateAccount(input.accountId, input.requesterUserId);
    if (!account) {
      throw new BadRequestException('Affiliate account is invalid or not owned by current user');
    }

    const skip = (input.page - 1) * input.pageSize;
    const [entries, total] = await Promise.all([
      this.repository.findCommissionEntriesByAccount(input.accountId, skip, input.pageSize),
      this.repository.countCommissionEntriesByAccount(input.accountId),
    ]);
    return {
      items: entries.map(toAffiliateCommissionEntryResponse),
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages: Math.ceil(total / input.pageSize),
    };
  }
}
