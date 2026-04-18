import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';
import { toDistributionNodeResponse } from './network.mapper';

@Injectable()
export class AcceptDistributionNodeInvitationUseCase {
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
      throw new BadRequestException('Only the invited distributor owner can accept this invitation');
    }

    if (node.relationshipStatus !== 'INVITED') {
      throw new BadRequestException('Only invited nodes can accept invitations');
    }

    if (node.parentNodeId) {
      const parentNode = await this.repository.findNodeById(node.parentNodeId);
      if (!parentNode || parentNode.relationshipStatus !== 'ACTIVE' || parentNode.shop.shopStatus !== 'active') {
        throw new BadRequestException('Parent node must be active before accepting invitation');
      }
    }

    if (node.shop.shopStatus !== 'active') {
      throw new BadRequestException('Distributor shop must be active before accepting invitation');
    }

    const updatedNode = await this.repository.updateNodeRelationshipStatus(node.id, 'ACTIVE');
    return toDistributionNodeResponse(updatedNode);
  }
}
