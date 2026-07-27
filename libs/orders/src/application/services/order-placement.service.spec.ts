import { OrderPlacementService } from './order-placement.service';

describe('OrderPlacementService COD debt policy', () => {
  it('checks overdue COD debt before reserving inventory for a new order', async () => {
    const tx = {};
    const repository = {
      withSerializableTransaction: jest.fn(
        (callback: (client: typeof tx) => unknown) => callback(tx),
      ),
    };
    const inventory = { reserveForOrder: jest.fn() };
    const codSettlement = {
      assertShopsCanReceiveOrdersInTransaction: jest.fn().mockRejectedValue(
        new Error('SHOP_COD_DEBT_OVERDUE'),
      ),
    };
    const service = new OrderPlacementService(
      repository as never,
      inventory as never,
      codSettlement as never,
    );

    await expect(service.createAggregateOrder({
      buyerUserId: 'buyer-1',
      legacyShopId: 'shop-1',
      paymentMethod: 'COD',
      baseAmount: 100000,
      discountAmount: 0,
      platformFeeAmount: 20000,
      buyerPayableAmount: 100000,
      sellerReceivableAmount: 80000,
      shippingFeeAmount: 0,
      shipping: {
        name: 'Buyer',
        phone: '0900000000',
        address: 'Address',
      },
      groups: [{
        shopId: 'shop-1',
        fulfillmentStatus: 'PENDING',
        baseAmount: 100000,
        discountAmount: 0,
        platformFeeAmount: 20000,
        sellerReceivableAmount: 80000,
        shippingFeeAmount: 0,
        items: [],
      }],
    } as never)).rejects.toThrow('SHOP_COD_DEBT_OVERDUE');

    expect(codSettlement.assertShopsCanReceiveOrdersInTransaction).toHaveBeenCalledWith(
      tx,
      ['shop-1'],
    );
    expect(inventory.reserveForOrder).not.toHaveBeenCalled();
  });
});
