import { Injectable } from '@nestjs/common';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';
import { toDistributionMembershipResponse } from './network.mapper';

@Injectable()
export class ListMyDistributionMembershipsUseCase {
  constructor(private readonly repository: DistributionPricingRepository) {}

  async execute(requesterUserId: string) {
    const memberships = await this.repository.findMembershipsByOwner(requesterUserId);
    return memberships.map(toDistributionMembershipResponse);
  }
}
