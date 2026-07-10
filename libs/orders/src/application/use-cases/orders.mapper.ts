import { Prisma } from '@prisma/client';
import { CartWithItems, OrderWithRelations, OrderAuditLogRecord } from '../../infrastructure/persistence/orders.repository';

export interface MyOrdersSimplifiedResponse {
  id: string;
  orderCode: string;
  status: string;
  shopId: string;
  shopName: string;
  totalAmount: number;
  paymentMethod: string;
  firstProduct: {
    name: string;
    variant: string;
    quantity: number;
    price: number;
    image: string;
  };
  otherProducts: number;
}

export interface OrderDetailResponse {
  id: string;
  orderCode: string;
  status: string;
  createdAt: string;
  receiverName: string;
  receiverPhone: string;
  shippingAddress: string;
  paymentMethod: string;
  paymentStatus: string;
  carrier?: string;
  trackingCode?: string;
  shippingMethod?: string;
  estimatedDelivery?: string;
  subtotal: number;
  discount: number;
  shippingFee: number;
  totalAmount: number;
  shops: {
    shopId: string;
    shopName: string;
    fulfillmentStatus: string;
    items: {
      id: string;
      productName: string;
      thumbnailUrl: string;
      variantName?: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }[];
  }[];
  histories: {
    status: string;
    description: string;
    createdAt: string;
  }[];
}

type OrderShopProjectionSource = {
  shopId: string;
  shop: { shopName: string };
  shopGroups?: Array<{
    id?: string;
    shopId: string;
    shop: { shopName: string };
  }>;
  items?: Array<{
    orderShopGroupId?: string | null;
    offer?: {
      shopId: string;
      shop?: { shopName: string } | null;
    } | null;
  }>;
};

export function resolveOrderShopSummaries(order: OrderShopProjectionSource) {
  if (order.shopGroups?.length) {
    return order.shopGroups.map((group) => ({
      shopId: group.shopId,
      shopName: group.shop.shopName,
    }));
  }

  const offerShops = new Map<string, string>();
  for (const item of order.items ?? []) {
    if (item.offer?.shopId && item.offer.shop?.shopName) {
      offerShops.set(item.offer.shopId, item.offer.shop.shopName);
    }
  }
  if (offerShops.size > 0) {
    return Array.from(offerShops, ([shopId, shopName]) => ({ shopId, shopName }));
  }

  // LEGACY_SAFE: pre-multi-shop orders may have neither shop groups nor loaded offer-shop relations.
  return [{ shopId: order.shopId, shopName: order.shop.shopName }];
}

function resolveOrderItemShop(order: OrderShopProjectionSource, item: NonNullable<OrderShopProjectionSource['items']>[number]) {
  if (item.offer?.shopId && item.offer.shop?.shopName) {
    return { shopId: item.offer.shopId, shopName: item.offer.shop.shopName };
  }

  const group = item.orderShopGroupId
    ? order.shopGroups?.find((candidate) => candidate.id === item.orderShopGroupId)
    : order.shopGroups?.length === 1
      ? order.shopGroups[0]
      : null;
  if (group) {
    return { shopId: group.shopId, shopName: group.shop.shopName };
  }

  // LEGACY_SAFE: only old order rows without group/item shop relations reach this fallback.
  return { shopId: order.shopId, shopName: order.shop.shopName };
}

export function toOrderResponse(order: OrderWithRelations) {
  const openDispute = order.disputes?.[0] ?? null;
  const items = order.items.map((item) => toOrderItemResponse(order, item));
  const shops = groupItemsByShop(
    items.map((item, index) => ({
      ...resolveOrderItemShop(order, order.items[index]),
      item,
    })),
  ).map((shop) => {
    const group = order.shopGroups?.find((candidate) => candidate.shopId === shop.shopId);
    return {
      ...shop,
      orderShopGroupId: group?.id ?? null,
      fulfillmentStatus: group?.fulfillmentStatus ?? order.fulfillmentStatus,
      shippingFeeAmount: group ? decimalToNumber(group.shippingFeeAmount) : null,
      shippingProviderCode: group?.shippingProviderCode ?? order.shippingProviderCode,
      shippingTrackingCode: group?.shippingTrackingCode ?? order.shippingTrackingCode,
    };
  });
  const [primaryShop] = resolveOrderShopSummaries(order);

  return {
    id: order.id,
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
    sellerShopId: primaryShop.shopId,
    sellerShopName: primaryShop.shopName,
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
    shops,
    createdAt: order.createdAt,
  };
}

export function toMyOrdersSimplifiedResponse(order: OrderWithRelations): MyOrdersSimplifiedResponse {
  const firstItem = order.items[0];
  const representativeShop = firstItem
    ? resolveOrderItemShop(order, firstItem)
    : resolveOrderShopSummaries(order)[0];
  const offerMedia = firstItem?.offer?.media ?? [];
  const thumbnailMedia =
    offerMedia.find((media) => media.mediaType === 'thumbnail' && (media.mediaAsset?.secureUrl || media.fileUrl)) ??
    offerMedia.find((media) => media.mediaAsset?.secureUrl || media.fileUrl);

  // Generate order code from ID (e.g., "#ORD-ABC123DE")
  const orderCode = `#ORD-${order.id.substring(0, 8).toUpperCase()}`;

  return {
    id: order.id,
    orderCode,
    status: order.orderStatus,
    shopId: representativeShop.shopId,
    shopName: representativeShop.shopName,
    totalAmount: decimalToNumber(order.totalAmount),
    paymentMethod: order.paymentIntent?.paymentMethod ?? '',
    firstProduct: firstItem
      ? {
          name: firstItem.offerTitleSnapshot,
          variant: firstItem.offer?.modelName ?? '',
          quantity: firstItem.quantity,
          price: decimalToNumber(firstItem.unitPrice),
          image: thumbnailMedia?.mediaAsset?.secureUrl ?? thumbnailMedia?.fileUrl ?? '',
        }
      : {
          name: '',
          variant: '',
          quantity: 0,
          price: 0,
          image: '',
        },
    otherProducts: order.items.length - 1,
  };
}

export function toOrderDetailResponse(order: OrderWithRelations, auditLogs: OrderAuditLogRecord[]): OrderDetailResponse {
  const orderCode = `#ORD-${order.id.substring(0, 8).toUpperCase()}`;

  // Build histories from audit logs with Vietnamese descriptions
  const histories = buildOrderHistories(auditLogs);

  // Build shops and items
  const shops = buildOrderDetailShops(order);

  // Calculate amounts
  const subtotal = decimalToNumber(order.baseAmount);
  const discount = decimalToNumber(order.discountAmount);
  const shippingFee = decimalToNumber(order.shippingFeeAmount);

  return {
    id: order.id,
    orderCode,
    status: order.orderStatus,
    createdAt: order.createdAt.toISOString(),
    receiverName: order.shippingName ?? '',
    receiverPhone: order.shippingPhone ?? '',
    shippingAddress: order.shippingAddress ?? '',
    paymentMethod: order.paymentIntent?.paymentMethod ?? '',
    paymentStatus: order.paymentIntent?.paymentStatus ?? '',
    carrier: order.shippingProviderName ?? undefined,
    trackingCode: order.shippingTrackingCode ?? undefined,
    shippingMethod: order.shippingServiceId ? `${order.shippingProviderName} - Service ${order.shippingServiceId}` : undefined,
    estimatedDelivery: undefined, // Would need additional data to calculate
    subtotal,
    discount,
    shippingFee,
    totalAmount: decimalToNumber(order.totalAmount),
    shops,
    histories,
  };
}

function buildOrderHistories(auditLogs: OrderAuditLogRecord[]): OrderDetailResponse['histories'] {
  const statusDescriptions: Record<string, string> = {
    'PENDING': 'Chờ thanh toán',
    'PAID': 'Đã thanh toán',
    'CONFIRMED': 'Người bán xác nhận',
    'PROCESSING': 'Đang đóng gói',
    'SHIPPED': 'Đang giao hàng',
    'DELIVERED': 'Giao hàng thành công',
    'CANCELLED': 'Đơn hàng bị hủy',
    'REFUNDING': 'Đang hoàn tiền',
    'REFUNDED': 'Hoàn tiền thành công',
  };

  const actionDescriptions: Record<string, string> = {
    'FULFILLMENT_STATUS_CHANGED': 'Cập nhật trạng thái đơn hàng',
    'PAYMENT_STATUS_CHANGED': 'Cập nhật trạng thái thanh toán',
    'SHIPPING_BOOKED': 'Đặt hàng vận chuyển',
    'SHIPPING_STATUS_SYNCED': 'Cập nhật trạng thái vận chuyển',
  };

  return auditLogs.map((log) => {
    let description = actionDescriptions[log.action] || log.action;
    
    if (log.toStatus && statusDescriptions[log.toStatus]) {
      description = statusDescriptions[log.toStatus];
    }

    return {
      status: log.toStatus || log.action,
      description,
      createdAt: log.createdAt.toISOString(),
    };
  });
}

function buildOrderDetailShops(order: OrderWithRelations): OrderDetailResponse['shops'] {
  interface ShopDetail {
    shopId: string;
    shopName: string;
    fulfillmentStatus: string;
    items: Array<{
      id: string;
      productName: string;
      thumbnailUrl: string;
      variantName?: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
  }

  const shopMap = new Map<string, ShopDetail>();

  for (const item of order.items) {
    const { shopId, shopName } = resolveOrderItemShop(order, item);
    const shopGroup = order.shopGroups?.find((group) => group.shopId === shopId);
    const fulfillmentStatus = shopGroup?.fulfillmentStatus ?? order.fulfillmentStatus;

    if (!shopMap.has(shopId)) {
      const shopDetail: ShopDetail = {
        shopId,
        shopName,
        fulfillmentStatus,
        items: [] as Array<ShopDetail['items'][number]>,
      };
      shopMap.set(shopId, shopDetail);
    }

    const shop = shopMap.get(shopId)!;
    const offerMedia = item.offer?.media ?? [];
    const thumbnailMedia =
      offerMedia.find((media) => media.mediaType === 'thumbnail' && (media.mediaAsset?.secureUrl || media.fileUrl)) ??
      offerMedia.find((media) => media.mediaAsset?.secureUrl || media.fileUrl);

    shop.items.push({
      id: item.id,
      productName: item.offerTitleSnapshot,
      thumbnailUrl: thumbnailMedia?.mediaAsset?.secureUrl ?? thumbnailMedia?.fileUrl ?? '',
      variantName: item.offer?.modelName ?? undefined,
      quantity: item.quantity,
      unitPrice: decimalToNumber(item.unitPrice),
      totalPrice: decimalToNumber(item.unitPrice) * item.quantity,
    });
  }

  return Array.from(shopMap.values());
}

export function toCartResponse(cart: CartWithItems) {
  const items = cart.items.map((item) => toCartItemResponse(item));

  return {
    id: cart.id,
    buyerUserId: cart.buyerUserId,
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
    variantId: item.variantId ?? null,
    variantSku: item.variant?.sku ?? null,
    offerTitleSnapshot: item.offerTitleSnapshot,
    thumbnailUrl: thumbnailMedia?.mediaAsset?.secureUrl ?? thumbnailMedia?.fileUrl ?? null,
    unitPriceSnapshot: decimalToNumber(item.unitPriceSnapshot),
    currencySnapshot: item.currencySnapshot,
    shopNameSnapshot: item.shopNameSnapshot,
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
