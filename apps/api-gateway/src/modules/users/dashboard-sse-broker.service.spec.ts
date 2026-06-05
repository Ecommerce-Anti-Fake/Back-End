import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { DashboardSseBrokerService } from './dashboard-sse-broker.service';

describe('DashboardSseBrokerService', () => {
  it('delivers dashboard invalidations only to matching scopes', async () => {
    const service = new DashboardSseBrokerService();
    const userEvent = firstValueFrom(service.streamForScopes(['user:buyer-1']).pipe(take(1)));
    const shopEvent = firstValueFrom(service.streamForScopes(['shop:shop-1']).pipe(take(1)));

    expect(
      service.notify({
        reason: 'order_changed',
        resource: 'order',
        scopes: ['user:buyer-1', 'shop:shop-1'],
        orderId: 'order-1',
        shopId: 'shop-1',
        userId: 'buyer-1',
      }),
    ).toBe(true);

    await expect(userEvent).resolves.toMatchObject({
      type: 'dashboard.invalidate',
      data: { reason: 'order_changed', scope: 'user:buyer-1', orderId: 'order-1' },
    });
    await expect(shopEvent).resolves.toMatchObject({
      type: 'dashboard.invalidate',
      data: { reason: 'order_changed', scope: 'shop:shop-1', shopId: 'shop-1' },
    });
  });

  it('targets buyer, seller shop, and admin when an order changes', async () => {
    const service = new DashboardSseBrokerService();
    const adminEvent = firstValueFrom(service.streamForScopes(['role:admin']).pipe(take(1)));
    const buyerEvent = firstValueFrom(service.streamForScopes(['user:buyer-1']).pipe(take(1)));
    const shopEvent = firstValueFrom(service.streamForScopes(['shop:shop-1']).pipe(take(1)));

    service.notifyOrderChanged({ id: 'order-1', buyerUserId: 'buyer-1', sellerShopId: 'shop-1' });

    await expect(adminEvent).resolves.toMatchObject({ data: { scope: 'role:admin' } });
    await expect(buyerEvent).resolves.toMatchObject({ data: { scope: 'user:buyer-1' } });
    await expect(shopEvent).resolves.toMatchObject({ data: { scope: 'shop:shop-1' } });
  });
});
