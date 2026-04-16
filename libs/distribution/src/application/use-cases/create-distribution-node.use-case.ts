import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';
import { toDistributionNodeResponse } from './network.mapper';

@Injectable()
export class CreateDistributionNodeUseCase {
  constructor(private readonly repository: DistributionPricingRepository) {}

  async execute(input: {
    requesterUserId: string;
    networkId: string;
    shopId: string;
    parentNodeId: string;
  }) {
    const network = await this.repository.findOwnedNetworkByUser(input.networkId, input.requesterUserId);
    if (!network) {
      throw new NotFoundException('Distribution network not found or not owned by current user');
    }

    if (network.manufacturerShop.shopStatus !== 'active') {
      throw new BadRequestException('Only active manufacturer shops can manage distribution nodes');
    }

    const parentNode = await this.repository.findNodeById(input.parentNodeId);
    if (!parentNode || parentNode.networkId !== input.networkId) {
      throw new BadRequestException('Parent node is invalid for this network');
    }

    if (parentNode.relationshipStatus !== 'ACTIVE' || parentNode.shop.shopStatus !== 'active') {
      throw new BadRequestException('Parent node must belong to an active shop and active relationship');
    }

    const agentShop = await this.repository.findAgentShopById(input.shopId);
    if (!agentShop) {
      throw new BadRequestException('Only DISTRIBUTOR shops can be added as child distribution nodes');
    }

    const existingNode = await this.repository.findNodeByNetworkAndShop(input.networkId, input.shopId);
    if (existingNode) {
      throw new BadRequestException('Shop is already part of this distribution network');
    }

    const level = parentNode.level + 1;
    if (level < 1 || level > 3) {
      throw new BadRequestException('Distribution network only supports agent levels 1 to 3');
    }

    const node = await this.repository.createNode({
      networkId: input.networkId,
      shopId: input.shopId,
      parentNodeId: input.parentNodeId,
      level,
      nodeType: this.resolveNodeType(level),
    });

    return toDistributionNodeResponse(node);
  }

  private resolveNodeType(level: number): 'AGENT_LEVEL_1' | 'AGENT_LEVEL_2' | 'AGENT_LEVEL_3' {
    if (level === 1) {
      return 'AGENT_LEVEL_1';
    }

    if (level === 2) {
      return 'AGENT_LEVEL_2';
    }

    return 'AGENT_LEVEL_3';
  }
}
