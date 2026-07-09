import { toAdminOpenDisputeResponse } from './admin-disputes.mapper';

describe('admin disputes mapper', () => {
  it('does not present the legacy order shop as the only seller for a multi-shop dispute', () => {
    const dispute = {
      id: 'dispute-1',
      orderId: 'order-1',
      disputeStatus: 'OPEN',
      reason: 'Wrong item',
      openedByUserId: 'buyer-1',
      openedAt: new Date('2026-07-09T00:00:00.000Z'),
      order: {
        shopId: 'legacy-shop',
        shop: { shopName: 'Legacy Shop' },
        shopGroups: [
          { shopId: 'shop-1', shop: { shopName: 'Shop One' } },
          { shopId: 'shop-2', shop: { shopName: 'Shop Two' } },
        ],
        buyerUserId: 'buyer-1',
        buyerShopId: null,
        orderStatus: 'paid',
      },
    };

    const response = toAdminOpenDisputeResponse(dispute as any);

    expect(response.sellerShopId).toBe('shop-1');
    expect(response.sellerShopName).toBe('Shop One');
    expect(response.shops).toEqual([
      { shopId: 'shop-1', shopName: 'Shop One' },
      { shopId: 'shop-2', shopName: 'Shop Two' },
    ]);
  });
});
