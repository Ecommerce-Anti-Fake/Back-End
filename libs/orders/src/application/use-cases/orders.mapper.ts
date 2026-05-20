import { Prisma } from '@prisma/client';
import { CartWithItems, OrderWithRelations } from '../../infrastructure/persistence/orders.repository';

export function toOrderResponse(order: OrderWithRelations) {
  const openDispute = order.disputes?.[0] ?? null;

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
    openDispute: openDispute
      ? {
          id: openDispute.id,
          reason: openDispute.reason,
          disputeStatus: openDispute.disputeStatus,
          openedAt: openDispute.openedAt,
        }
      : null,
    openDisputeId: openDispute?.id ?? null,
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
    items: order.items.map((item) => {
      const offerMedia = item.offer?.media ?? [];
      const thumbnailMedia =
        offerMedia.find((media) => media.mediaType === 'thumbnail' && (media.mediaAsset?.secureUrl || media.fileUrl)) ??
        offerMedia.find((media) => media.mediaAsset?.secureUrl || media.fileUrl);

      return {
        id: item.id,
        offerId: item.offerId,
        offerTitleSnapshot: item.offerTitleSnapshot,
        thumbnailUrl: thumbnailMedia?.mediaAsset?.secureUrl ?? thumbnailMedia?.fileUrl ?? null,
        unitPrice: decimalToNumber(item.unitPrice),
        quantity: item.quantity,
        verificationLevelSnapshot: item.verificationLevelSnapshot,
        reviewId: item.reviews?.[0]?.id ?? null,
        reviewRating: item.reviews?.[0]?.rating ?? null,
        reviewComment: item.reviews?.[0]?.comment ?? null,
        reviewCreatedAt: item.reviews?.[0]?.createdAt ?? null,
        reviewed: Boolean(item.reviews?.[0]),
        canReview: order.orderStatus === 'completed' || order.fulfillmentStatus === 'DELIVERED',
        batchAllocations: item.batchAllocations.map((allocation) => ({
          batchId: allocation.batchId,
          quantity: allocation.quantity,
          batchNumber: allocation.batch?.batchNumber ?? null,
          sourceName: allocation.batch?.sourceName ?? null,
          countryOfOrigin: allocation.batch?.countryOfOrigin ?? null,
          sourceType: allocation.batch?.sourceType ?? null,
          sourceOrderId: allocation.batch?.sourceOrderId ?? null,
          sourceOrderItemId: allocation.batch?.sourceOrderItemId ?? null,
          receivedAt: allocation.batch?.receivedAt ?? null,
        })),
      };
    }),
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
