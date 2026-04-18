import { Injectable } from '@nestjs/common';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';
import { toDistributionNodeResponse } from './network.mapper';

@Injectable()
export class ListMyDistributionInvitationsUseCase {
  constructor(private readonly repository: DistributionPricingRepository) {}

  async execute(requesterUserId: string) {
    const invitations = await this.repository.findInvitedNodesByOwner(requesterUserId);
    return invitations.map(toDistributionNodeResponse);
  }
}
