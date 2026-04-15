import { Injectable } from '@nestjs/common';
import { AffiliateRepository } from '../../infrastructure/persistence/affiliate.repository';
import { toAffiliateAccountResponse } from './affiliate.mapper';

@Injectable()
export class ListMyAffiliateAccountsUseCase {
  constructor(private readonly repository: AffiliateRepository) {}

  async execute(requesterUserId: string) {
    const accounts = await this.repository.findAffiliateAccountsByUser(requesterUserId);
    return accounts.map(toAffiliateAccountResponse);
  }
}
