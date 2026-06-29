import { Injectable } from '@nestjs/common';
import { OrdersRepository, OrderWithRelations } from '../../infrastructure/persistence/orders.repository';

type SummaryMetricsInput = {
  requesterUserId: string;
  shopId: string;
  from?: string;
  to?: string;
};

const DEFAULT_DAYS = 7;
const MIN_DAYS = 1;
const MAX_DAYS = 31;

@Injectable()
export class GetSellerShopSummaryMetricsUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(input: SummaryMetricsInput) {
    const orders = await this.ordersRepository.findOrdersForSellerShop({
      requesterUserId: input.requesterUserId,
      shopId: input.shopId,
    });
    const range = resolveRange(input.from, input.to);
    const previousRange = {
      from: addDays(range.from, -range.days),
      to: addDays(range.from, -1),
    };
    const currentOrders = orders.filter((order) => isWithinDayRange(order.createdAt, range.from, range.to));
    const previousOrders = orders.filter((order) => isWithinDayRange(order.createdAt, previousRange.from, previousRange.to));

    return {
      range: {
        from: range.from.toISOString(),
        to: endOfDay(range.to).toISOString(),
        days: range.days,
      },
      revenue: metric(sumRevenue(currentOrders), sumRevenue(previousOrders)),
      orders: metric(currentOrders.length, previousOrders.length),
      offers: metric(soldOfferItemQuantity(currentOrders), soldOfferItemQuantity(previousOrders)),
    };
  }
}

function metric(current: number, previous: number) {
  return {
    value: current,
    growthPercent: growthPercent(current, previous),
  };
}

function sumRevenue(orders: OrderWithRelations[]) {
  return orders.reduce((total, order) => total + Number(order.sellerReceivableAmount || order.buyerPayableAmount || order.totalAmount || 0), 0);
}

function soldOfferItemQuantity(orders: OrderWithRelations[]) {
  return orders.reduce(
    (total, order) => total + (order.items ?? []).reduce((itemTotal, item) => itemTotal + Number(item.quantity || 0), 0),
    0,
  );
}

function growthPercent(current: number, previous: number) {
  if (!previous) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function resolveRange(from?: string, to?: string) {
  const fallbackTo = startOfDayUtc(new Date());
  const parsedTo = to ? parseDateOnlyUtc(to) : null;
  const parsedFrom = from ? parseDateOnlyUtc(from) : null;
  const rangeTo = parsedTo ?? fallbackTo;
  const rangeFrom = parsedFrom ?? addDays(rangeTo, -(DEFAULT_DAYS - 1));
  const orderedFrom = rangeFrom <= rangeTo ? rangeFrom : rangeTo;
  const orderedTo = rangeFrom <= rangeTo ? rangeTo : rangeFrom;
  const days = daySpan(orderedFrom, orderedTo);

  return {
    from: orderedFrom,
    to: addDays(orderedFrom, days - 1),
    days,
  };
}

function parseDateOnlyUtc(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month, day));

  return Number.isNaN(date.getTime()) ? null : date;
}

function daySpan(from: Date, to: Date) {
  const diff = startOfDayUtc(to).getTime() - startOfDayUtc(from).getTime();
  return Math.min(MAX_DAYS, Math.max(MIN_DAYS, Math.floor(diff / 86_400_000) + 1));
}

function startOfDayUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function endOfDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function isWithinDayRange(value: Date, start: Date, end: Date) {
  const day = startOfDayUtc(value);
  return day >= startOfDayUtc(start) && day <= startOfDayUtc(end);
}
