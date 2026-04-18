import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';
import { toDistributionNodeResponse } from './network.mapper';

@Injectable()
export class UpdateDistributionNodeStatusUseCase {
  constructor(private readonly repository: DistributionPricingRepository) {}

  async execute(input: {
    requesterUserId: string;
    networkId: string;
    nodeId: string;
    relationshipStatus: 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
  }) {
    const network = await this.repository.findOwnedNetworkByUser(input.networkId, input.requesterUserId);
    if (!network) {
      throw new NotFoundException('Distribution network not found or not owned by current user');
    }

    if (network.manufacturerShop.shopStatus !== 'active') {
      throw new BadRequestException('Only active manufacturer shops can manage distribution nodes');
    }

    const node = await this.repository.findNodeById(input.nodeId);
    if (!node || node.networkId !== input.networkId) {
      throw new NotFoundException('Distribution node not found in this network');
    }

    if (node.nodeType === 'MANUFACTURER' || node.level === 0) {
      throw new BadRequestException('Manufacturer root node cannot change relationship status');
    }

    if (node.relationshipStatus === input.relationshipStatus) {
      throw new BadRequestException('Distribution node is already in the requested status');
    }

    if (input.relationshipStatus === 'ACTIVE') {
      if (node.parentNodeId) {
        const parentNode = await this.repository.findNodeById(node.parentNodeId);
        if (!parentNode || parentNode.relationshipStatus !== 'ACTIVE' || parentNode.shop.shopStatus !== 'active') {
          throw new BadRequestException('Parent node must be active before reactivating this distributor');
        }
      }

      if (node.shop.shopStatus !== 'active') {
        throw new BadRequestException('Distributor shop must be active before reactivating the node');
      }
    }

    if (input.relationshipStatus === 'SUSPENDED' || input.relationshipStatus === 'TERMINATED') {
      const activeChildNodes = await this.repository.findActiveChildNodes(node.id);
      if (activeChildNodes.length > 0) {
        throw new BadRequestException('Cannot change node status while it still has active child distributors');
      }
    }

    const updatedNode = await this.repository.updateNodeRelationshipStatus(node.id, input.relationshipStatus);
    return toDistributionNodeResponse(updatedNode);
  }
}
