import { BadRequestException, Injectable } from '@nestjs/common';
import { AffiliateRepository } from '../../infrastructure/persistence/affiliate.repository';
import { toAffiliateConversionResponse } from './affiliate.mapper';

@Injectable()
export class ListAffiliateConversionsByAccountUseCase {
  constructor(private readonly repository: AffiliateRepository) {}

  async execute(input: { requesterUserId: string; accountId: string }) {
    const account = await this.repository.findOwnedAffiliateAccount(input.accountId, input.requesterUserId);
    if (!account) {
      throw new BadRequestException('Affiliate account is invalid or not owned by current user');
    }

    const conversions = await this.repository.findConversionsByAccount(input.accountId);
    return conversions.map(toAffiliateConversionResponse);
  }
}
