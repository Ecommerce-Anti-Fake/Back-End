import { Prisma } from '@prisma/client';
import { CartWithItems, OrderWithRelations } from '../../infrastructure/persistence/orders.repository';

export function toOrderResponse(order: OrderWithRelations) {
  return {
    id: order.id,
    orderMode: order.orderMode,
    orderStatus: order.orderStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    paymentStatus: order.paymentIntent?.paymentStatus ?? null,
    paymentMethod: order.paymentIntent?.paymentMethod ?? null,
    paymentProviderRef: order.paymentIntent?.providerRef ?? null,
    paymentCreatedAt: order.paymentIntent?.createdAt ?? null,
    escrowStatus: order.escrow?.escrowStatus ?? null,
    escrowHoldAt: order.escrow?.holdAt ?? null,
    escrowReleaseAt: order.escrow?.releaseAt ?? null,
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
    shippingName: order.shippingName,
    shippingPhone: order.shippingPhone,
    shippingAddress: order.shippingAddress,
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

export function toCartResponse(cart: CartWithItems) {
  return {
    id: cart.id,
    buyerUserId: cart.buyerUserId,
    cartStatus: cart.cartStatus,
    items: cart.items.map((item) => ({
      id: item.id,
      offerId: item.offerId,
      offerTitleSnapshot: item.offerTitleSnapshot,
      unitPriceSnapshot: decimalToNumber(item.unitPriceSnapshot),
      currencySnapshot: item.currencySnapshot,
      shopNameSnapshot: item.shopNameSnapshot,
      quantity: item.quantity,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
    createdAt: cart.createdAt,
    updatedAt: cart.updatedAt,
  };
}

function decimalToNumber(value: Prisma.Decimal) {
  return Number(value.toString());
}
