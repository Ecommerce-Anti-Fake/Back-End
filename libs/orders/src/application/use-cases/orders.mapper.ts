import { Prisma } from '@prisma/client';
import { CartWithItems, OrderWithRelations } from '../../infrastructure/persistence/orders.repository';

export function toOrderResponse(order: OrderWithRelations) {
  const openDispute = order.disputes?.[0] ?? null;
  const items = order.items.map((item) => toOrderItemResponse(order, item));

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
    escrowHeldAmount: order.escrow ? decimalToNumber(order.escrow.heldAmount) : null,
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
    shippingDistrictId: order.shippingDistrictId,
    shippingDistrictName: order.shippingDistrictName,
    shippingWardCode: order.shippingWardCode,
    shippingWardName: order.shippingWardName,
    shippingProviderCode: order.shippingProviderCode,
    shippingProviderName: order.shippingProviderName,
    shippingServiceId: order.shippingServiceId,
    shippingServiceTypeId: order.shippingServiceTypeId,
    shippingFeeAmount: decimalToNumber(order.shippingFeeAmount),
    shippingTrackingCode: order.shippingTrackingCode,
    parcelWeightGrams: order.parcelWeightGrams,
    parcelLengthCm: order.parcelLengthCm,
    parcelWidthCm: order.parcelWidthCm,
    parcelHeightCm: order.parcelHeightCm,
    items,
    shops: groupItemsByShop(
      items.map((item, index) => ({
        shopId: order.items[index].offer?.shopId ?? order.shopId,
        shopName: order.items[index].offer?.shop?.shopName ?? order.shop.shopName,
        item,
      })),
    ),
    createdAt: order.createdAt,
  };
}

export function toCartResponse(cart: CartWithItems) {
  const items = cart.items.map((item) => toCartItemResponse(item));

  return {
    id: cart.id,
    buyerUserId: cart.buyerUserId,
    cartStatus: cart.cartStatus,
    items,
    shops: groupItemsByShop(
      items.map((item, index) => ({
        shopId: cart.items[index].offer.shopId,
        shopName: cart.items[index].offer.shop.shopName,
        item,
      })),
    ),
    createdAt: cart.createdAt,
    updatedAt: cart.updatedAt,
  };
}

function toOrderItemResponse(order: OrderWithRelations, item: OrderWithRelations['items'][number]) {
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
    batchAllocations: (item.batchAllocations ?? []).map((allocation) => ({
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
}

function toCartItemResponse(item: CartWithItems['items'][number]) {
  const offerMedia = item.offer?.media ?? [];
  const thumbnailMedia =
    offerMedia.find((media) => media.mediaType === 'thumbnail' && (media.mediaAsset?.secureUrl || media.fileUrl)) ??
    offerMedia.find((media) => media.mediaAsset?.secureUrl || media.fileUrl);

  return {
    id: item.id,
    offerId: item.offerId,
    offerTitleSnapshot: item.offerTitleSnapshot,
    thumbnailUrl: thumbnailMedia?.mediaAsset?.secureUrl ?? thumbnailMedia?.fileUrl ?? null,
    unitPriceSnapshot: decimalToNumber(item.unitPriceSnapshot),
    currencySnapshot: item.currencySnapshot,
    shopNameSnapshot: item.shopNameSnapshot,
    shippingMethods: (item.offer?.shippingMethods ?? []).map((method) => ({
      providerCode: method.providerCode,
      providerName: method.providerName,
      shippingFee: decimalToNumber(method.shippingFee),
      estimatedDays: method.estimatedDays,
      isEnabled: method.isEnabled,
    })),
    quantity: item.quantity,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function groupItemsByShop<T>(entries: Array<{ shopId: string; shopName: string; item: T }>) {
  const groups = new Map<string, { shopId: string; shopName: string; items: T[] }>();

  for (const entry of entries) {
    const key = entry.shopId;
    const group = groups.get(key);

    if (group) {
      group.items.push(entry.item);
      continue;
    }

    groups.set(key, {
      shopId: entry.shopId,
      shopName: entry.shopName,
      items: [entry.item],
    });
  }

  return Array.from(groups.values());
}

function decimalToNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value.toString());
}
