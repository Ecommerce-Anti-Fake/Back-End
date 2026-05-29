import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DistributionPricingPolicy, Prisma } from '@prisma/client';
import {
  WholesalePricingInput,
  WholesalePricingPort,
  WholesalePricingResult,
} from '../../application/ports';
import { OrdersRepository } from '../persistence/orders.repository';

@Injectable()
export class LocalWholesalePricingAdapter implements WholesalePricingPort {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async resolve(input: WholesalePricingInput): Promise<WholesalePricingResult> {
    let buyerDistributionNodeId: string | null = null;
    let unitPrice = this.decimalToNumber(input.offer.price);
    let discountPercent = 0;

    if (input.buyerDistributionNodeId) {
      const buyerNode = await this.ordersRepository.findDistributionNodeById(input.buyerDistributionNodeId);
      if (!buyerNode) {
        throw new NotFoundException('Buyer distribution node not found');
      }

      if (buyerNode.shopId !== input.buyerShopId) {
        throw new BadRequestException('Distribution node does not belong to buyer shop');
      }

      if (buyerNode.relationshipStatus !== 'ACTIVE' || buyerNode.shop.shopStatus !== 'active') {
        throw new BadRequestException('Buyer distribution node must be active before using in-network pricing');
      }

      if (!input.offer.distributionNode) {
        throw new BadRequestException('Only offers attached to a distribution node can use in-network pricing');
      }

      if (buyerNode.networkId !== input.offer.distributionNode.networkId) {
        throw new BadRequestException('Buyer distribution node is not in the same network as the offer');
      }

      if (
        input.offer.distributionNode.relationshipStatus !== 'ACTIVE' ||
        input.offer.distributionNode.shop.shopStatus !== 'active'
      ) {
        throw new BadRequestException('Seller distribution node must be active before using in-network pricing');
      }

      this.assertDirectDistributionTrade(buyerNode, input.offer.distributionNode);

      buyerDistributionNodeId = buyerNode.id;

      const policies = await this.ordersRepository.findApplicablePricingPolicies({
        networkId: buyerNode.networkId,
        nodeId: buyerNode.id,
        appliesToLevel: buyerNode.level,
        categoryId: input.offer.categoryId,
        quantity: input.quantity,
        now: new Date(),
      });

      const selectedPolicy = this.selectBestPricingPolicy(policies, {
        nodeId: buyerNode.id,
        level: buyerNode.level,
        categoryId: input.offer.categoryId,
      });

      discountPercent = selectedPolicy
        ? this.validateAndGetDiscountPercent(selectedPolicy)
        : this.getTierDiscountPercent(buyerNode.level);
      unitPrice = this.applyPercentDiscount(unitPrice, discountPercent);
    }

    const baseUnitPrice = this.decimalToNumber(input.offer.price);
    const baseAmount = this.roundMoney(baseUnitPrice * input.quantity);
    const discountedAmount = this.roundMoney(unitPrice * input.quantity);
    const discountAmount = this.roundMoney(baseAmount - discountedAmount);
    const isInNetworkTrade = buyerDistributionNodeId !== null;
    const platformFeeAmount = isInNetworkTrade
      ? this.roundMoney(baseAmount * ((20 - discountPercent) / 100))
      : this.roundMoney(baseAmount * 0.2);
    const buyerPayableAmount = isInNetworkTrade
      ? discountedAmount
      : baseAmount;
    const sellerReceivableAmount = isInNetworkTrade
      ? this.roundMoney(baseAmount * 0.8)
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

  private assertDirectDistributionTrade(
    buyerNode: {
      id: string;
      level: number;
      parentNodeId: string | null;
    },
    sellerNode: {
      id: string;
      level: number;
    },
  ) {
    if (buyerNode.parentNodeId !== sellerNode.id || buyerNode.level !== sellerNode.level + 1) {
      throw new BadRequestException('Buyer distribution node must be a direct child of the seller node');
    }
  }

  private getPolicySpecificityScore(
    policy: DistributionPricingPolicy,
    target: {
      nodeId: string;
      level: number;
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

    // Prefer policies that specify category over generic policies.
    if (policy.categoryId === target.categoryId) {
      score += 5;
    } else if (!policy.categoryId) {
      score += 1;
    }

    return score;
  }

  private applyPercentDiscount(basePrice: number, discountPercent: number) {
    const discountedPrice = basePrice * (1 - discountPercent / 100);
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

  private getTierDiscountPercent(level: number) {
    if (level === 1) {
      return 15;
    }

    if (level === 2) {
      return 10;
    }

    if (level === 3) {
      return 5;
    }

    throw new BadRequestException('Distribution pricing only supports buyer levels 1 to 3');
  }

  private decimalToNumber(value: Prisma.Decimal) {
    return Number(value.toString());
  }

  private roundMoney(value: number) {
    return Math.round(value * 100) / 100;
  }
}
