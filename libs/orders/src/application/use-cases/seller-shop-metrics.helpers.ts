import { OrderWithRelations } from '../../infrastructure/persistence/orders.repository';

export function getShopRevenue(order: OrderWithRelations, shopId: string) {
  const group = getMatchingShopGroup(order, shopId);
  if (group) {
    return Number(group.sellerReceivableAmount ?? 0);
  }

  if (!hasShopGroups(order) && order.shopId === shopId) {
    return Number(order.sellerReceivableAmount ?? 0);
  }

  return 0;
}

export function getShopPlatformFee(order: OrderWithRelations, shopId: string) {
  const group = getMatchingShopGroup(order, shopId);
  if (group) {
    return Number(group.platformFeeAmount ?? 0);
  }

  if (!hasShopGroups(order) && order.shopId === shopId) {
    return Number(order.platformFeeAmount ?? 0);
  }

  return 0;
}

export function getShopItems(order: OrderWithRelations, shopId: string) {
  const groupIds = new Set((order.shopGroups ?? []).filter((group) => group.shopId === shopId).map((group) => group.id));
  const items = order.items ?? [];

  if (groupIds.size > 0) {
    return items.filter((item) => {
      const belongsToGroup = item.orderShopGroupId ? groupIds.has(item.orderShopGroupId) : false;
      const belongsToOfferShop = item.offer?.shop?.id ? item.offer.shop.id === shopId : true;
      return belongsToGroup && belongsToOfferShop;
    });
  }

  if (order.shopId !== shopId) return [];

  return items.filter((item) => !item.offer?.shop?.id || item.offer.shop.id === shopId);
}

export function getShopFulfillmentStatus(order: OrderWithRelations, shopId: string) {
  return getMatchingShopGroup(order, shopId)?.fulfillmentStatus ?? order.fulfillmentStatus;
}

function getMatchingShopGroup(order: OrderWithRelations, shopId: string) {
  return order.shopGroups?.find((group) => group.shopId === shopId) ?? null;
}

function hasShopGroups(order: OrderWithRelations) {
  return Boolean(order.shopGroups?.length);
}
