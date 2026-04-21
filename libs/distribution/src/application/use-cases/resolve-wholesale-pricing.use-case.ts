import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DistributionPricingPolicy, Prisma } from '@prisma/client';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';

@Injectable()
export class ResolveWholesalePricingUseCase {
  constructor(private readonly repository: DistributionPricingRepository) {}

  async execute(input: {
    buyerShopId: string;
    buyerDistributionNodeId?: string;
    quantity: number;
    offer: {
      price: number;
      productModelId: string;
      categoryId: string;
      distributionNodeId?: string | null;
      distributionNetworkId?: string | null;
    };
  }) {
    let buyerDistributionNodeId: string | null = null;
    let unitPrice = input.offer.price;
    let discountPercent = 0;

    if (input.buyerDistributionNodeId) {
      const buyerNode = await this.repository.findNodeById(input.buyerDistributionNodeId);
      if (!buyerNode) {
        throw new NotFoundException('Buyer distribution node not found');
      }

      if (buyerNode.shopId !== input.buyerShopId) {
        throw new BadRequestException('Distribution node does not belong to buyer shop');
      }

      if (buyerNode.relationshipStatus !== 'ACTIVE' || buyerNode.shop.shopStatus !== 'active') {
        throw new BadRequestException('Buyer distribution node must be active before using in-network pricing');
      }

      if (!input.offer.distributionNodeId || !input.offer.distributionNetworkId) {
        throw new BadRequestException('Only offers attached to a distribution node can use in-network pricing');
      }

      if (buyerNode.networkId !== input.offer.distributionNetworkId) {
        throw new BadRequestException('Buyer distribution node is not in the same network as the offer');
      }

      buyerDistributionNodeId = buyerNode.id;

      const policies = await this.repository.findApplicablePricingPolicies({
        networkId: buyerNode.networkId,
        nodeId: buyerNode.id,
        appliesToLevel: buyerNode.level,
        productModelId: input.offer.productModelId,
        categoryId: input.offer.categoryId,
        quantity: input.quantity,
        now: new Date(),
      });

      const selectedPolicy = this.selectBestPricingPolicy(policies, {
        nodeId: buyerNode.id,
        level: buyerNode.level,
        productModelId: input.offer.productModelId,
        categoryId: input.offer.categoryId,
      });

      if (selectedPolicy) {
        discountPercent = this.validateAndGetDiscountPercent(selectedPolicy);
        unitPrice = this.applyPricingPolicy(unitPrice, selectedPolicy);
      }
    }

    const baseAmount = this.roundMoney(input.offer.price * input.quantity);
    const discountedAmount = this.roundMoney(unitPrice * input.quantity);
    const discountAmount = this.roundMoney(baseAmount - discountedAmount);
    const isInNetworkTrade = buyerDistributionNodeId !== null;
    const platformFeeAmount = isInNetworkTrade
      ? this.roundMoney(discountedAmount * (discountPercent / 100))
      : this.roundMoney(baseAmount * 0.2);
    const buyerPayableAmount = isInNetworkTrade
      ? this.roundMoney(discountedAmount + platformFeeAmount)
      : baseAmount;
    const sellerReceivableAmount = isInNetworkTrade
      ? discountedAmount
      : this.roundMoney(baseAmount - platformFeeAmount);

    return {
      buyerDistributionNodeId,
      unitPrice,
      discountPercent,
      baseAmount,
      discountAmount,
      platformFeeAmount,
      buyerPayableAmount,
      sellerReceivableAmount,
      totalAmount: buyerPayableAmount,
      isInNetworkTrade,
    };
  }

  private selectBestPricingPolicy(
    policies: DistributionPricingPolicy[],
    target: {
      nodeId: string;
      level: number;
      productModelId: string;
      categoryId: string;
    },
  ) {
    const ranked = [...policies].sort((left, right) => {
      const specificityDiff =
        this.getPolicySpecificityScore(right, target) - this.getPolicySpecificityScore(left, target);
      if (specificityDiff !== 0) {
        return specificityDiff;
      }

      const priorityDiff = left.priority - right.priority;
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return right.createdAt.getTime() - left.createdAt.getTime();
    });

    return ranked[0] ?? null;
  }

  private getPolicySpecificityScore(
    policy: DistributionPricingPolicy,
    target: {
      nodeId: string;
      level: number;
      productModelId: string;
      categoryId: string;
    },
  ) {
    let score = 0;

    if (policy.scope === 'NODE_SPECIFIC' && policy.nodeId === target.nodeId) {
      score += 100;
    } else if (policy.scope === 'NODE_LEVEL' && policy.appliesToLevel === target.level) {
      score += 60;
    } else if (policy.scope === 'NETWORK_DEFAULT') {
      score += 20;
    }

    if (policy.productModelId === target.productModelId) {
      score += 10;
    } else if (!policy.productModelId) {
      score += 1;
    }

    if (policy.categoryId === target.categoryId) {
      score += 5;
    } else if (!policy.categoryId) {
      score += 1;
    }

    return score;
  }

  private applyPricingPolicy(basePrice: number, policy: DistributionPricingPolicy) {
    const discountValue = this.decimalToNumber(policy.discountValue);

    if (policy.discountType === 'FIXED_PRICE') {
      return Math.max(discountValue, 0);
    }

    if (policy.discountType === 'FIXED_AMOUNT') {
      return Math.max(basePrice - discountValue, 0);
    }

    const discountedPrice = basePrice * (1 - discountValue / 100);
    return Math.max(this.roundMoney(discountedPrice), 0);
  }

  private validateAndGetDiscountPercent(policy: DistributionPricingPolicy) {
    if (policy.discountType !== 'PERCENT') {
      throw new BadRequestException('In-network pricing policy must use percent discount');
    }

    const discountPercent = this.decimalToNumber(policy.discountValue);
    if (discountPercent < 5 || discountPercent > 20) {
      throw new BadRequestException('In-network discount percent must be between 5% and 20%');
    }

    return discountPercent;
  }

  private decimalToNumber(value: Prisma.Decimal) {
    return Number(value.toString());
  }

  private roundMoney(value: number) {
    return Math.round(value * 100) / 100;
  }
}
