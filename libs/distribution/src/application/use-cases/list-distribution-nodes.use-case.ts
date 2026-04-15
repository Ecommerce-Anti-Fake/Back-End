import { Injectable, NotFoundException } from '@nestjs/common';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';
import { toDistributionNodeResponse } from './network.mapper';

@Injectable()
export class ListDistributionNodesUseCase {
  constructor(private readonly repository: DistributionPricingRepository) {}

  async execute(input: { requesterUserId: string; networkId: string }) {
    const network = await this.repository.findOwnedNetworkByUser(input.networkId, input.requesterUserId);
    if (!network) {
      throw new NotFoundException('Distribution network not found or not owned by current user');
    }

    const nodes = await this.repository.findNodesByNetwork(input.networkId);
    return nodes.map(toDistributionNodeResponse);
  }
}
