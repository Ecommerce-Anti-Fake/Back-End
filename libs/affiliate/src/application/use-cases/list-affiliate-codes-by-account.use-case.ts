import { BadRequestException, Injectable } from '@nestjs/common';
import { AffiliateRepository } from '../../infrastructure/persistence/affiliate.repository';
import { toAffiliateCodeResponse } from './affiliate.mapper';

@Injectable()
export class ListAffiliateCodesByAccountUseCase {
  constructor(private readonly repository: AffiliateRepository) {}

  async execute(input: { requesterUserId: string; accountId: string }) {
    const account = await this.repository.findOwnedAffiliateAccount(input.accountId, input.requesterUserId);
    if (!account) {
      throw new BadRequestException('Affiliate account is invalid or not owned by current user');
    }

    const codes = await this.repository.findAffiliateCodesByAccount(input.accountId);
    return codes.map(toAffiliateCodeResponse);
  }
}
