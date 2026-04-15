import { Prisma } from '@prisma/client';
import { OrderWithRelations } from '../../infrastructure/persistence/orders.repository';

export function toOrderResponse(order: OrderWithRelations) {
  return {
    id: order.id,
    orderMode: order.orderMode,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentIntent?.paymentStatus ?? null,
    sellerShopId: order.shopId,
    sellerShopName: order.shop.shopName,
    buyerUserId: order.buyerUserId,
    buyerShopId: order.buyerShopId,
    buyerDistributionNodeId: order.buyerDistributionNodeId,
    baseAmount: decimalToNumber(order.baseAmount),
    discountAmount: decimalToNumber(order.discountAmount),
    platformFeeAmount: decimalToNumber(order.platformFeeAmount),
    buyerPayableAmount: decimalToNumber(order.buyerPayableAmount),
    sellerReceivableAmount: decimalToNumber(order.sellerReceivableAmount),
    totalAmount: decimalToNumber(order.totalAmount),
    items: order.items.map((item) => ({
      offerId: item.offerId,
      offerTitleSnapshot: item.offerTitleSnapshot,
      unitPrice: decimalToNumber(item.unitPrice),
      quantity: item.quantity,
      verificationLevelSnapshot: item.verificationLevelSnapshot,
    })),
    createdAt: order.createdAt,
  };
}

function decimalToNumber(value: Prisma.Decimal) {
  return Number(value.toString());
}
