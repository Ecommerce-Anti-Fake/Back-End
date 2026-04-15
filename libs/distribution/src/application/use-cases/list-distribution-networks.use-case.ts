import { Injectable } from '@nestjs/common';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';
import { toDistributionNetworkResponse } from './network.mapper';

@Injectable()
export class ListDistributionNetworksUseCase {
  constructor(private readonly repository: DistributionPricingRepository) {}

  async execute(requesterUserId: string) {
    const networks = await this.repository.findNetworksByOwnerUserId(requesterUserId);
    return networks.map(toDistributionNetworkResponse);
  }
}
