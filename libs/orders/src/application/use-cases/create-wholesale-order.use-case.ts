import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DistributionPricingPolicy, Prisma } from '@prisma/client';
import { OfferForOrdering, OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { toOrderResponse } from './orders.mapper';

@Injectable()
export class CreateWholesaleOrderUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(input: {
    buyerUserId: string;
    buyerShopId: string;
    buyerDistributionNodeId?: string;
    offerId: string;
    quantity: number;
    affiliateCode?: string | null;
  }) {
    const buyer = await this.ordersRepository.findUserById(input.buyerUserId);
    if (!buyer) {
      throw new NotFoundException('Buyer not found');
    }

    if (!buyer.phone) {
      throw new BadRequestException('Please update your profile phone number before creating an order');
    }

    const offer: OfferForOrdering | null = await this.ordersRepository.findOfferForOrdering(input.offerId);
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (offer.salesMode === 'RETAIL') {
      throw new BadRequestException('This offer only supports retail orders');
    }

    if (input.quantity < 1) {
      throw new BadRequestException('Quantity must be greater than zero');
    }

    if (input.quantity > offer.availableQuantity) {
      throw new BadRequestException('Quantity exceeds available stock');
    }

    if (offer.minWholesaleQty && input.quantity < offer.minWholesaleQty) {
      throw new BadRequestException('Quantity does not meet minimum wholesale quantity');
    }

    const buyerShop = await this.ordersRepository.findOwnedShop(input.buyerShopId, input.buyerUserId);
    if (!buyerShop) {
      throw new BadRequestException('Buyer shop does not belong to current user');
    }

    let buyerDistributionNodeId: string | null = null;
    let unitPrice = Number(offer.price.toString());
    let discountPercent = 0;

    if (input.buyerDistributionNodeId) {
      const buyerNode = await this.ordersRepository.findDistributionNodeById(input.buyerDistributionNodeId);
      if (!buyerNode) {
        throw new NotFoundException('Buyer distribution node not found');
      }

      if (buyerNode.shopId !== input.buyerShopId) {
        throw new BadRequestException('Distribution node does not belong to buyer shop');
      }

      if (offer.distributionNode && buyerNode.networkId !== offer.distributionNode.networkId) {
        throw new BadRequestException('Buyer distribution node is not in the same network as the offer');
      }

      buyerDistributionNodeId = buyerNode.id;

      const policies = await this.ordersRepository.findApplicablePricingPolicies({
        networkId: buyerNode.networkId,
        nodeId: buyerNode.id,
        appliesToLevel: buyerNode.level,
        productModelId: offer.productModelId,
        categoryId: offer.categoryId,
        quantity: input.quantity,
        now: new Date(),
      });

      const selectedPolicy = this.selectBestPricingPolicy(policies, {
        nodeId: buyerNode.id,
        level: buyerNode.level,
        productModelId: offer.productModelId,
        categoryId: offer.categoryId,
      });

      if (selectedPolicy) {
        discountPercent = this.validateAndGetDiscountPercent(selectedPolicy);
        unitPrice = this.applyPricingPolicy(unitPrice, selectedPolicy);
      }
    }

    const baseUnitPrice = Number(offer.price.toString());
    const baseAmount = this.roundMoney(baseUnitPrice * input.quantity);
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

    const order = await this.ordersRepository.createOrder({
      buyerUserId: input.buyerUserId,
      buyerShopId: input.buyerShopId,
      buyerDistributionNodeId,
      shopId: offer.shopId,
      orderMode: 'WHOLESALE',
      orderType: 'wholesale_purchase',
      orderStatus: 'pending',
      baseAmount,
      discountAmount,
      platformFeeAmount,
      buyerPayableAmount,
      sellerReceivableAmount,
      totalAmount: buyerPayableAmount,
      item: {
        offerId: offer.id,
        offerTitleSnapshot: offer.title,
        unitPrice,
        quantity: input.quantity,
        verificationLevelSnapshot: offer.verificationLevel,
      },
      affiliateAttribution: input.affiliateCode
        ? {
            affiliateCode: input.affiliateCode,
            customerUserId: input.buyerUserId,
            offerId: offer.id,
            sellerShopId: offer.shopId,
            brandId: offer.productModel.brandId,
            productModelId: offer.productModelId,
            orderAmount: buyerPayableAmount,
            commissionBase: platformFeeAmount,
          }
        : undefined,
    });

    return toOrderResponse(order);
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
      const specificityDiff = this.getPolicySpecificityScore(right, target) - this.getPolicySpecificityScore(left, target);
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
