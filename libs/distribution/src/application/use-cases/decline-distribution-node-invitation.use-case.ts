import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';
import { toDistributionNodeResponse } from './network.mapper';

@Injectable()
export class DeclineDistributionNodeInvitationUseCase {
  constructor(private readonly repository: DistributionPricingRepository) {}

  async execute(input: { requesterUserId: string; nodeId: string }) {
    const node = await this.repository.findNodeById(input.nodeId);
    if (!node) {
      throw new NotFoundException('Distribution node invitation not found');
    }

    if (node.nodeType === 'MANUFACTURER') {
      throw new BadRequestException('Manufacturer node does not use invitation flow');
    }

    if (node.shop.ownerUserId !== input.requesterUserId) {
      throw new BadRequestException('Only the invited distributor owner can decline this invitation');
    }

    if (node.relationshipStatus !== 'INVITED') {
      throw new BadRequestException('Only invited nodes can decline invitations');
    }

    const updatedNode = await this.repository.updateNodeRelationshipStatus(node.id, 'DECLINED');
    return toDistributionNodeResponse(updatedNode);
  }
}
