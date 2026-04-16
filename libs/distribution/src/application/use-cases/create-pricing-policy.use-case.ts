import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DistributionPricingPolicy } from '@prisma/client';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';
import { toDistributionPricingPolicyResponse } from './pricing-policy.mapper';

@Injectable()
export class CreatePricingPolicyUseCase {
  constructor(private readonly pricingRepository: DistributionPricingRepository) {}

  async execute(input: {
    requesterUserId: string;
    networkId: string;
    scope: 'NETWORK_DEFAULT' | 'NODE_LEVEL' | 'NODE_SPECIFIC';
    nodeId?: string | null;
    appliesToLevel?: number | null;
    productModelId?: string | null;
    categoryId?: string | null;
    discountValue: number;
    minQuantity?: number | null;
    priority?: number;
    startsAt?: string | null;
    endsAt?: string | null;
  }) {
    const network = await this.pricingRepository.findOwnedNetworkByUser(input.networkId, input.requesterUserId);
    if (!network) {
      throw new NotFoundException('Distribution network not found or not owned by current user');
    }

    if (network.manufacturerShop.shopStatus !== 'active') {
      throw new BadRequestException('Only active manufacturer shops can manage distribution pricing');
    }

    const startsAt = this.parseOptionalDate(input.startsAt);
    const endsAt = this.parseOptionalDate(input.endsAt);
    if (startsAt && endsAt && startsAt > endsAt) {
      throw new BadRequestException('startsAt must be earlier than endsAt');
    }

    if (input.discountValue < 5 || input.discountValue > 20) {
      throw new BadRequestException('Discount percent must be between 5% and 20%');
    }

    let nodeId: string | null = null;
    let targetLevel: number | null = null;

    if (input.scope === 'NODE_SPECIFIC') {
      if (!input.nodeId) {
        throw new BadRequestException('nodeId is required for NODE_SPECIFIC policy');
      }

      const node = await this.pricingRepository.findNodeById(input.nodeId);
      if (!node || node.networkId !== input.networkId) {
        throw new BadRequestException('Distribution node is invalid for this network');
      }

      if (node.relationshipStatus !== 'ACTIVE' || node.shop.shopStatus !== 'active') {
        throw new BadRequestException('Pricing policy can only target active distribution nodes');
      }

      nodeId = node.id;
      targetLevel = node.level;
    }

    if (input.scope === 'NODE_LEVEL') {
      if (!input.appliesToLevel || ![1, 2, 3].includes(input.appliesToLevel)) {
        throw new BadRequestException('appliesToLevel must be one of 1, 2, 3 for NODE_LEVEL policy');
      }

      targetLevel = input.appliesToLevel;
    }

    if (input.scope === 'NETWORK_DEFAULT') {
      targetLevel = null;
    }

    await this.validateHierarchyConstraint({
      networkId: input.networkId,
      targetLevel,
      discountValue: input.discountValue,
      productModelId: input.productModelId ?? null,
      categoryId: input.categoryId ?? null,
      minQuantity: input.minQuantity ?? null,
    });

    const policy = await this.pricingRepository.createPolicy({
      networkId: input.networkId,
      nodeId,
      appliesToLevel: targetLevel,
      productModelId: input.productModelId ?? null,
      categoryId: input.categoryId ?? null,
      scope: input.scope,
      discountValue: input.discountValue,
      minQuantity: input.minQuantity ?? null,
      priority: input.priority ?? 100,
      startsAt,
      endsAt,
    });

    return toDistributionPricingPolicyResponse(policy);
  }

  private async validateHierarchyConstraint(input: {
    networkId: string;
    targetLevel: number | null;
    discountValue: number;
    productModelId: string | null;
    categoryId: string | null;
    minQuantity: number | null;
  }) {
    if (!input.targetLevel) {
      return;
    }

    const targetLevel = input.targetLevel;

    const comparablePolicies = await this.pricingRepository.findComparablePolicies({
      networkId: input.networkId,
      productModelId: input.productModelId,
      categoryId: input.categoryId,
      minQuantity: input.minQuantity,
    });

    const upperLevelPolicies = comparablePolicies.filter((policy) => this.getPolicyLevel(policy) < targetLevel);
    const lowerLevelPolicies = comparablePolicies.filter((policy) => this.getPolicyLevel(policy) > targetLevel);

    for (const policy of upperLevelPolicies) {
      if (input.discountValue >= this.decimalToNumber(policy.discountValue)) {
        throw new BadRequestException('Discount hierarchy must satisfy level 1 > level 2 > level 3');
      }
    }

    for (const policy of lowerLevelPolicies) {
      if (input.discountValue <= this.decimalToNumber(policy.discountValue)) {
        throw new BadRequestException('Discount hierarchy must satisfy level 1 > level 2 > level 3');
      }
    }
  }

  private getPolicyLevel(policy: DistributionPricingPolicy) {
    if (policy.scope === 'NODE_LEVEL') {
      return policy.appliesToLevel ?? 99;
    }

    if (policy.scope === 'NODE_SPECIFIC') {
      return policy.appliesToLevel ?? 99;
    }

    return 99;
  }

  private decimalToNumber(value: DistributionPricingPolicy['discountValue']) {
    return Number(value.toString());
  }

  private parseOptionalDate(value?: string | null) {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid datetime format');
    }

    return date;
  }
}
