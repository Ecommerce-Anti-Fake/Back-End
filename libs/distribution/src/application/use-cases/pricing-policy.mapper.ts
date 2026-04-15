import { DistributionPricingPolicy, Prisma } from '@prisma/client';

export function toDistributionPricingPolicyResponse(policy: DistributionPricingPolicy) {
  return {
    id: policy.id,
    networkId: policy.networkId,
    scope: policy.scope,
    nodeId: policy.nodeId,
    appliesToLevel: policy.appliesToLevel,
    productModelId: policy.productModelId,
    categoryId: policy.categoryId,
    discountType: policy.discountType,
    discountValue: decimalToNumber(policy.discountValue),
    minQuantity: policy.minQuantity,
    priority: policy.priority,
    isActive: policy.isActive,
    startsAt: policy.startsAt,
    endsAt: policy.endsAt,
    createdAt: policy.createdAt,
  };
}

function decimalToNumber(value: Prisma.Decimal) {
  return Number(value.toString());
}
