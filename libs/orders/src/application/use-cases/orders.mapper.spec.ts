import { Prisma } from '@prisma/client';
import { toCartResponse, toOrderResponse } from './orders.mapper';

describe('orders mapper shop grouping', () => {
  it('groups active cart items by shop with shop id and name', () => {
    const cart = {
      id: 'cart-1',
      buyerUserId: 'buyer-1',
      cartStatus: 'ACTIVE',
      createdAt: new Date('2026-06-01T10:00:00.000Z'),
      updatedAt: new Date('2026-06-01T10:05:00.000Z'),
      items: [
        createCartItem({ id: 'cart-item-1', offerId: 'offer-1', shopId: 'shop-1', shopName: 'Shop One' }),
        createCartItem({ id: 'cart-item-2', offerId: 'offer-2', shopId: 'shop-1', shopName: 'Shop One' }),
        createCartItem({ id: 'cart-item-3', offerId: 'offer-3', shopId: 'shop-2', shopName: 'Shop Two' }),
      ],
    };

    const response = toCartResponse(cart as any);

    expect(response).not.toHaveProperty('cartStatus');
    expect(response).not.toHaveProperty('items');
    expect(response.shops).toHaveLength(2);
    expect(response.shops[0]).toMatchObject({
      shopId: 'shop-1',
      shopName: 'Shop One',
      items: [{ id: 'cart-item-1' }, { id: 'cart-item-2' }],
    });
    expect(response.shops[1]).toMatchObject({
      shopId: 'shop-2',
      shopName: 'Shop Two',
      items: [{ id: 'cart-item-3' }],
    });
    expect(response.shops[0].items[0]).not.toHaveProperty('shippingMethods');
  });

  it('groups order items by shop with shop id and name', () => {
    const order = {
      id: 'order-1',
      orderStatus: 'paid',
      fulfillmentStatus: 'PROCESSING',
      paymentIntent: null,
      escrow: null,
      disputes: [],
      shopId: 'shop-1',
      shop: { shopName: 'Shop One', ownerUserId: 'seller-1' },
      buyerUserId: 'buyer-1',
      buyerShopId: null,
      buyerDistributionNodeId: null,
      baseAmount: new Prisma.Decimal(300000),
      discountAmount: new Prisma.Decimal(0),
      platformFeeAmount: new Prisma.Decimal(0),
      buyerPayableAmount: new Prisma.Decimal(300000),
      sellerReceivableAmount: new Prisma.Decimal(300000),
      totalAmount: new Prisma.Decimal(300000),
      shippingName: null,
      shippingPhone: null,
      shippingAddress: null,
      shippingDistrictId: null,
      shippingDistrictName: null,
      shippingWardCode: null,
      shippingWardName: null,
      shippingProviderCode: null,
      shippingProviderName: null,
      shippingServiceId: null,
      shippingServiceTypeId: null,
      shippingFeeAmount: new Prisma.Decimal(0),
      shippingTrackingCode: null,
      parcelWeightGrams: null,
      parcelLengthCm: null,
      parcelWidthCm: null,
      parcelHeightCm: null,
      createdAt: new Date('2026-06-01T10:00:00.000Z'),
      items: [
        createOrderItem({ id: 'order-item-1', offerId: 'offer-1', shopId: 'shop-1', shopName: 'Shop One' }),
        createOrderItem({ id: 'order-item-2', offerId: 'offer-2', shopId: 'shop-1', shopName: 'Shop One' }),
      ],
    };

    const response = toOrderResponse(order as any);

    expect(response.shops).toMatchObject([
      {
        shopId: 'shop-1',
        shopName: 'Shop One',
        items: [{ id: 'order-item-1' }, { id: 'order-item-2' }],
      },
    ]);
  });
});

function createCartItem(input: { id: string; offerId: string; shopId: string; shopName: string }) {
  return {
    id: input.id,
    offerId: input.offerId,
    offerTitleSnapshot: `Offer ${input.offerId}`,
    unitPriceSnapshot: new Prisma.Decimal(100000),
    currencySnapshot: 'VND',
    shopNameSnapshot: input.shopName,
    quantity: 1,
    createdAt: new Date('2026-06-01T10:00:00.000Z'),
    updatedAt: new Date('2026-06-01T10:05:00.000Z'),
    offer: {
      shopId: input.shopId,
      shop: {
        id: input.shopId,
        shopName: input.shopName,
      },
      media: [],
      shippingMethods: [],
    },
  };
}

function createOrderItem(input: { id: string; offerId: string; shopId: string; shopName: string }) {
  return {
    id: input.id,
    offerId: input.offerId,
    offerTitleSnapshot: `Offer ${input.offerId}`,
    unitPrice: new Prisma.Decimal(150000),
    quantity: 1,
    verificationLevelSnapshot: 'standard',
    reviews: [],
    batchAllocations: [],
    offer: {
      shopId: input.shopId,
      shop: {
        id: input.shopId,
        shopName: input.shopName,
      },
      media: [],
    },
  };
}
