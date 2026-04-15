import { Injectable } from '@nestjs/common';
import { AffiliateRepository } from '../../infrastructure/persistence/affiliate.repository';
import { toAffiliateProgramResponse } from './affiliate.mapper';

@Injectable()
export class ListMyAffiliateProgramsUseCase {
  constructor(private readonly repository: AffiliateRepository) {}

  async execute(requesterUserId: string) {
    const programs = await this.repository.findProgramsByOwnerUserId(requesterUserId);
    return programs.map(toAffiliateProgramResponse);
  }
}
