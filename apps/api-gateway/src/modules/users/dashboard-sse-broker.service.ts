import { Injectable, MessageEvent } from '@nestjs/common';
import { EMPTY, merge, Observable, Subject } from 'rxjs';

export type DashboardInvalidationScope = `user:${string}` | `shop:${string}` | 'role:admin';

export type DashboardInvalidationEvent = {
  reason:
    | 'account_changed'
    | 'admin_queue_changed'
    | 'live_changed'
    | 'notification_changed'
    | 'order_changed'
    | 'seller_dashboard_changed';
  scopes: DashboardInvalidationScope[];
  resource?: 'account' | 'live' | 'moderation' | 'notification' | 'order' | 'report' | 'seller_dashboard';
  orderId?: string | null;
  shopId?: string | null;
  userId?: string | null;
};

type OrderDashboardTarget = {
  id?: string | null;
  sellerShopId?: string | null;
  buyerUserId?: string | null;
};

@Injectable()
export class DashboardSseBrokerService {
  private readonly streams = new Map<DashboardInvalidationScope, Subject<MessageEvent>>();

  streamForScopes(scopes: DashboardInvalidationScope[]): Observable<MessageEvent> {
    const uniqueScopes = [...new Set(scopes)];
    if (!uniqueScopes.length) {
      return EMPTY;
    }

    return merge(...uniqueScopes.map((scope) => this.subjectForScope(scope).asObservable()));
  }

  notify(event: DashboardInvalidationEvent) {
    let delivered = false;
    for (const scope of new Set(event.scopes)) {
      const subject = this.streams.get(scope);
      if (!subject) {
        continue;
      }

      subject.next({
        type: 'dashboard.invalidate',
        data: {
          family: 'dashboard',
          reason: event.reason,
          resource: event.resource ?? null,
          scope,
          orderId: event.orderId ?? null,
          shopId: event.shopId ?? null,
          userId: event.userId ?? null,
        },
      });
      delivered = true;
    }

    return delivered;
  }

  notifyAdminQueue(resource: 'moderation' | 'report') {
    return this.notify({
      reason: 'admin_queue_changed',
      resource,
      scopes: ['role:admin'],
    });
  }

  notifyAccount(userId: string, reason: DashboardInvalidationEvent['reason'] = 'account_changed') {
    return this.notify({
      reason,
      resource: reason === 'notification_changed' ? 'notification' : 'account',
      scopes: [`user:${userId}`],
      userId,
    });
  }

  notifyShop(shopId: string, reason: DashboardInvalidationEvent['reason'] = 'seller_dashboard_changed') {
    return this.notify({
      reason,
      resource: reason === 'live_changed' ? 'live' : 'seller_dashboard',
      scopes: [`shop:${shopId}`],
      shopId,
    });
  }

  notifyOrderChanged(order: unknown, fallbackUserId?: string | null) {
    const target = toOrderDashboardTarget(order);
    const scopes: DashboardInvalidationScope[] = ['role:admin'];
    const buyerUserId = target.buyerUserId ?? fallbackUserId ?? null;
    if (buyerUserId) {
      scopes.push(`user:${buyerUserId}`);
    }
    if (target.sellerShopId) {
      scopes.push(`shop:${target.sellerShopId}`);
    }

    return this.notify({
      reason: 'order_changed',
      resource: 'order',
      scopes,
      orderId: target.id ?? null,
      shopId: target.sellerShopId ?? null,
      userId: buyerUserId,
    });
  }

  private subjectForScope(scope: DashboardInvalidationScope) {
    const existing = this.streams.get(scope);
    if (existing) {
      return existing;
    }

    const subject = new Subject<MessageEvent>();
    this.streams.set(scope, subject);

    return subject;
  }
}

function toOrderDashboardTarget(value: unknown): OrderDashboardTarget {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const record = value as Record<string, unknown>;
  return {
    id: typeof record.id === 'string' ? record.id : null,
    sellerShopId: typeof record.sellerShopId === 'string' ? record.sellerShopId : null,
    buyerUserId: typeof record.buyerUserId === 'string' ? record.buyerUserId : null,
  };
}
