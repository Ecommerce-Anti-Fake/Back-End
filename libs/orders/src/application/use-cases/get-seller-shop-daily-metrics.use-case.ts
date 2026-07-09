import { Injectable } from '@nestjs/common';
import {
  OrdersRepository,
  OrderWithRelations,
} from '../../infrastructure/persistence/orders.repository';
import { getShopRevenue } from './seller-shop-metrics.helpers';

type DailyMetricsInput = {
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
export class GetSellerShopDailyMetricsUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(input: DailyMetricsInput) {
    const orders = await this.ordersRepository.findOrdersForSellerShop({
      requesterUserId: input.requesterUserId,
      shopId: input.shopId,
    });
    const range = resolveRange(input.days, input.fromDate, input.toDate);
    const currentOrders = orders.filter((order) =>
      isWithinDayRange(order.createdAt, range.from, range.to),
    );

    return {
      range: {
        days: range.days,
        from: range.from.toISOString(),
        to: endOfDay(range.to).toISOString(),
      },
      series: buildDailySeries(currentOrders, range.from, range.days, input.shopId),
    };
  }
}

function buildDailySeries(
  orders: OrderWithRelations[],
  start: Date,
  days: number,
  shopId: string,
) {
  return Array.from({ length: days }, (_, index) => {
    const date = addDays(start, index);
    const dailyOrders = orders.filter((order) =>
      isSameDay(order.createdAt, date),
    );

    return {
      date: date.toISOString().slice(0, 10),
      label: `${String(date.getUTCDate()).padStart(2, '0')}/${String(
        date.getUTCMonth() + 1,
      ).padStart(2, '0')}`,
      revenue: sumRevenue(dailyOrders, shopId),
      orders: dailyOrders.length,
    };
  });
}

function sumRevenue(orders: OrderWithRelations[], shopId: string) {
  return orders.reduce(
    (total, order) => total + getShopRevenue(order, shopId),
    0,
  );
}

function resolveRange(days?: number, fromDate?: string, toDate?: string) {
  const explicitRange = resolveExplicitRange(fromDate, toDate);
  if (explicitRange) return explicitRange;

  const rangeDays = clampDays(days);
  const rangeTo = startOfDayUtc(new Date());
  const rangeFrom = addDays(rangeTo, -(rangeDays - 1));

  return {
    from: rangeFrom,
    to: rangeTo,
    days: rangeDays,
  };
}

function resolveExplicitRange(fromDate?: string, toDate?: string) {
  if (!fromDate && !toDate) return null;

  const fallbackTo = startOfDayUtc(new Date());
  const parsedTo = toDate ? parseDateOnlyUtc(toDate) : null;
  const parsedFrom = fromDate ? parseDateOnlyUtc(fromDate) : null;
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

function clampDays(value?: number) {
  const days = Number(value || DEFAULT_DAYS);
  if (!Number.isFinite(days)) return DEFAULT_DAYS;
  return Math.min(MAX_DAYS, Math.max(MIN_DAYS, Math.trunc(days)));
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
  return Math.min(
    MAX_DAYS,
    Math.max(MIN_DAYS, Math.floor(diff / 86_400_000) + 1),
  );
}

function startOfDayUtc(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function endOfDay(date: Date) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
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

function isSameDay(left: Date, right: Date) {
  return startOfDayUtc(left).getTime() === startOfDayUtc(right).getTime();
}
