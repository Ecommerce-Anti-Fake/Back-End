import { Prisma } from '@prisma/client';
import { toCartResponse, toMyOrdersSimplifiedResponse, toOrderResponse } from './orders.mapper';

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

  it('projects compact variant fields in cart items', () => {
    const cart = {
      id: 'cart-1',
      buyerUserId: 'buyer-1',
      cartStatus: 'ACTIVE',
      createdAt: new Date('2026-06-01T10:00:00.000Z'),
      updatedAt: new Date('2026-06-01T10:05:00.000Z'),
      items: [
        {
          ...createCartItem({ id: 'cart-item-1', offerId: 'offer-1', shopId: 'shop-1', shopName: 'Shop One' }),
          variantId: 'variant-1',
          variant: { id: 'variant-1', sku: 'AO-DEN-M' },
        },
      ],
    };

    const response = toCartResponse(cart as any);

    expect(response.shops[0].items[0]).toMatchObject({
      id: 'cart-item-1',
      variantId: 'variant-1',
      variantSku: 'AO-DEN-M',
    });
    expect(response.shops[0].items[0]).not.toHaveProperty('variant');
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

  it('uses multi-shop relations instead of the legacy order shop in order responses', () => {
    const order = createOrder({
      legacyShopId: 'legacy-shop',
      legacyShopName: 'Legacy Shop',
      items: [
        createOrderItem({ id: 'item-2', offerId: 'offer-2', shopId: 'shop-2', shopName: 'Shop Two' }),
        createOrderItem({ id: 'item-1', offerId: 'offer-1', shopId: 'shop-1', shopName: 'Shop One' }),
      ],
      shopGroups: [
        createShopGroup('group-1', 'shop-1', 'Shop One'),
        createShopGroup('group-2', 'shop-2', 'Shop Two'),
      ],
    });

    const response = toOrderResponse(order as any);
    const simplified = toMyOrdersSimplifiedResponse(order as any);

    expect(response.sellerShopId).toBe('shop-1');
    expect(response.sellerShopName).toBe('Shop One');
    expect(response.shops.map((shop) => shop.shopId)).toEqual(['shop-2', 'shop-1']);
    expect(simplified.shopId).toBe('shop-2');
    expect(simplified.shopName).toBe('Shop Two');
  });
});

function createOrder(input: {
  legacyShopId: string;
  legacyShopName: string;
  items: ReturnType<typeof createOrderItem>[];
  shopGroups: ReturnType<typeof createShopGroup>[];
}) {
  return {
    id: 'order-multi',
    orderStatus: 'paid',
    fulfillmentStatus: 'PENDING',
    paymentIntent: null,
    escrow: null,
    disputes: [],
    shopId: input.legacyShopId,
    shop: { shopName: input.legacyShopName, ownerUserId: 'legacy-seller' },
    shopGroups: input.shopGroups,
    buyerUserId: 'buyer-1',
    buyerShopId: null,
    buyerDistributionNodeId: null,
    baseAmount: new Prisma.Decimal(300000),
    discountAmount: new Prisma.Decimal(0),
    platformFeeAmount: new Prisma.Decimal(0),
    buyerPayableAmount: new Prisma.Decimal(300000),
    sellerReceivableAmount: new Prisma.Decimal(300000),
    totalAmount: new Prisma.Decimal(300000),
    shippingFeeAmount: new Prisma.Decimal(0),
    items: input.items,
    createdAt: new Date('2026-06-01T10:00:00.000Z'),
  };
}

function createShopGroup(id: string, shopId: string, shopName: string) {
  return {
    id,
    shopId,
    fulfillmentStatus: 'PENDING',
    shippingFeeAmount: new Prisma.Decimal(0),
    shippingProviderCode: null,
    shippingTrackingCode: null,
    shop: { id: shopId, shopName, ownerUserId: `owner-${shopId}` },
  };
}

function createCartItem(input: { id: string; offerId: string; shopId: string; shopName: string }) {
  return {
    id: input.id,
    offerId: input.offerId,
    variantId: null,
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
    variant: null,
  };
}

function createOrderItem(input: { id: string; offerId: string; shopId: string; shopName: string }) {
  return {
    id: input.id,
    offerId: input.offerId,
    offerTitleSnapshot: `Offer ${input.offerId}`,
    unitPrice: new Prisma.Decimal(150000),
    quantity: 1,
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
