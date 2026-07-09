import { Injectable } from '@nestjs/common';
import { OrdersRepository, OrderWithRelations } from '../../infrastructure/persistence/orders.repository';
import { toOrderResponse } from './orders.mapper';
import {
  getShopFulfillmentStatus,
  getShopItems,
  getShopPlatformFee,
  getShopRevenue,
} from './seller-shop-metrics.helpers';

type DashboardInput = {
  requesterUserId: string;
  shopId: string;
  days?: number;
  fromDate?: string;
  toDate?: string;
};

const DEFAULT_DAYS = 7;
const MIN_DAYS = 1;
const MAX_DAYS = 31;

@Injectable()
export class GetSellerShopDashboardAnalyticsUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(input: DashboardInput) {
    const days = clampDays(input.days);
    const orders = await this.ordersRepository.findOrdersForSellerShop({
      requesterUserId: input.requesterUserId,
      shopId: input.shopId,
    });
    const explicitRange = resolveExplicitRange(input.fromDate, input.toDate);
    const currentStart = explicitRange?.from ?? addDays(startOfDay(new Date()), -(days - 1));
    const requestedEnd = explicitRange?.to ?? startOfDay(new Date());
    const rangeDays = daySpan(currentStart, requestedEnd);
    const currentEnd = addDays(currentStart, rangeDays - 1);
    const previousStart = addDays(currentStart, -rangeDays);
    const previousEnd = addDays(currentStart, -1);
    const currentOrders = orders.filter((order) => isWithinDayRange(order.createdAt, currentStart, currentEnd));
    const previousOrders = orders.filter((order) => isWithinDayRange(order.createdAt, previousStart, previousEnd));
    const currentCustomers = uniqueCustomerCount(currentOrders);
    const previousCustomers = uniqueCustomerCount(previousOrders);

    return {
      range: {
        days: rangeDays,
        from: currentStart.toISOString(),
        to: endOfDay(currentEnd).toISOString(),
      },
      stats: {
        revenue: {
          value: sumRevenue(currentOrders, input.shopId),
          growthPercent: growthPercent(sumRevenue(currentOrders, input.shopId), sumRevenue(previousOrders, input.shopId)),
        },
        orders: {
          value: currentOrders.length,
          growthPercent: growthPercent(currentOrders.length, previousOrders.length),
        },
        products: {
          value: uniqueProductCount(orders, input.shopId),
          growthPercent: growthPercent(uniqueProductCount(currentOrders, input.shopId), uniqueProductCount(previousOrders, input.shopId)),
        },
        newCustomers: {
          value: currentCustomers,
          growthPercent: growthPercent(currentCustomers, previousCustomers),
        },
      },
      series: buildRevenueSeries(currentOrders, currentStart, rangeDays, input.shopId),
      recentOrders: currentOrders.slice(0, 5).map(toOrderResponse),
      topProducts: buildTopProducts(currentOrders, input.shopId),
      revenueOrders: currentOrders.map((order) => toRevenueOrder(order, input.shopId)),
    };
  }
}

function clampDays(value?: number) {
  const days = Number(value || DEFAULT_DAYS);
  if (!Number.isFinite(days)) return DEFAULT_DAYS;
  return Math.min(MAX_DAYS, Math.max(MIN_DAYS, Math.trunc(days)));
}

function sumRevenue(orders: OrderWithRelations[], shopId: string) {
  return orders.reduce((total, order) => total + getShopRevenue(order, shopId), 0);
}

function growthPercent(current: number, previous: number) {
  if (!previous) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function buildRevenueSeries(orders: OrderWithRelations[], start: Date, days: number, shopId: string) {
  return Array.from({ length: days }, (_, index) => {
    const date = addDays(start, index);
    const label = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
    const revenue = orders
      .filter((order) => isSameDay(order.createdAt, date))
      .reduce((total, order) => total + getShopRevenue(order, shopId), 0);

    return {
      date: date.toISOString().slice(0, 10),
      label,
      revenue,
      orders: orders.filter((order) => isSameDay(order.createdAt, date)).length,
    };
  });
}

function buildTopProducts(orders: OrderWithRelations[], shopId: string) {
  const byOffer = new Map<string, { offerId: string; title: string; thumbnailUrl: string | null; soldQuantity: number; revenue: number }>();

  for (const order of orders) {
    for (const item of getShopItems(order, shopId)) {
      const offerMedia = item.offer?.media ?? [];
      const thumbnailMedia =
        offerMedia.find((media) => media.mediaType === 'thumbnail' && (media.mediaAsset?.secureUrl || media.fileUrl)) ??
        offerMedia.find((media) => media.mediaAsset?.secureUrl || media.fileUrl);
      const offerId = item.offerId;
      const current = byOffer.get(offerId) ?? {
        offerId,
        title: item.offerTitleSnapshot,
        thumbnailUrl: thumbnailMedia?.mediaAsset?.secureUrl ?? thumbnailMedia?.fileUrl ?? null,
        soldQuantity: 0,
        revenue: 0,
      };

      current.soldQuantity += Number(item.quantity || 0);
      current.revenue += Number(item.unitPrice || 0) * Number(item.quantity || 0);
      byOffer.set(offerId, current);
    }
  }

  return [...byOffer.values()].sort((a, b) => b.soldQuantity - a.soldQuantity || b.revenue - a.revenue).slice(0, 5);
}

function toRevenueOrder(order: OrderWithRelations, shopId: string) {
  const shopItems = getShopItems(order, shopId);

  return {
    orderId: order.id,
    createdAt: order.createdAt,
    customerName: order.shippingName || order.buyerUserId || order.buyerShopId || null,
    paymentStatus: order.paymentIntent?.paymentStatus ?? null,
    fulfillmentStatus: getShopFulfillmentStatus(order, shopId),
    buyerPayableAmount: Number(order.buyerPayableAmount || 0),
    platformFeeAmount: getShopPlatformFee(order, shopId),
    sellerReceivableAmount: getShopRevenue(order, shopId),
    itemCount: shopItems.reduce((total, item) => total + Number(item.quantity || 0), 0),
  };
}

function uniqueProductCount(orders: OrderWithRelations[], shopId?: string) {
  return new Set(
    orders.flatMap((order) => (shopId ? getShopItems(order, shopId) : order.items ?? []).map((item) => item.offerId)),
  ).size;
}

function uniqueCustomerCount(orders: OrderWithRelations[]) {
  return new Set(orders.map((order) => order.buyerUserId || order.buyerShopId || order.shippingPhone || order.shippingName).filter(Boolean)).size;
}

function resolveExplicitRange(fromDate?: string, toDate?: string) {
  if (!fromDate && !toDate) return null;

  const fallbackEnd = startOfDay(new Date());
  const parsedFrom = fromDate ? parseDateOnly(fromDate) : null;
  const parsedTo = toDate ? parseDateOnly(toDate) : null;
  const to = parsedTo ?? fallbackEnd;
  const from = parsedFrom ?? addDays(to, -(DEFAULT_DAYS - 1));

  return from <= to ? { from, to } : { from: to, to: from };
}

function parseDateOnly(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return startOfDay(date);
}

function daySpan(from: Date, to: Date) {
  const diff = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.min(MAX_DAYS, Math.max(MIN_DAYS, Math.floor(diff / 86_400_000) + 1));
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isWithinDayRange(value: Date, start: Date, end: Date) {
  const day = startOfDay(value);
  return day >= startOfDay(start) && day <= startOfDay(end);
}

function isSameDay(left: Date, right: Date) {
  return startOfDay(left).getTime() === startOfDay(right).getTime();
}
