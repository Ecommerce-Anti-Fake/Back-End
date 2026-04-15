import { Injectable, NotFoundException } from '@nestjs/common';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';
import { toDistributionPricingPolicyResponse } from './pricing-policy.mapper';

@Injectable()
export class ListPricingPoliciesByNetworkUseCase {
  constructor(private readonly pricingRepository: DistributionPricingRepository) {}

  async execute(input: { requesterUserId: string; networkId: string }) {
    const network = await this.pricingRepository.findOwnedNetworkByUser(input.networkId, input.requesterUserId);
    if (!network) {
      throw new NotFoundException('Distribution network not found or not owned by current user');
    }

    const policies = await this.pricingRepository.findPoliciesByNetwork(input.networkId);
    return policies.map(toDistributionPricingPolicyResponse);
  }
}
