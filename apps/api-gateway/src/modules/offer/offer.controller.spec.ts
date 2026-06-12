import { OfferController } from './offer.controller';

describe('OfferController', () => {
  it('returns compact public offer list items', async () => {
    const catalogRpcService = {
      findOffers: jest.fn().mockResolvedValue([
        {
          id: 'offer-1',
          title: 'Kem chong nang SPF50',
          description: 'internal detail description',
          price: 150000,
          currency: 'VND',
          salesMode: 'RETAIL',
          minWholesaleQty: null,
          itemCondition: 'new',
          availableQuantity: 12,
          soldQuantity: 3,
          parcelWeightGrams: 500,
          verificationLevel: 'standard',
          offerStatus: 'active',
          shopId: 'shop-1',
          shopName: 'Shop ABC',
          shopType: 'MANUFACTURER',
          categoryId: 'category-1',
          categoryName: 'My pham',
          brandId: 'brand-1',
          gtin: '8938505970012',
          verificationPolicy: 'manual_review',
          distributionNodeId: 'node-1',
          distributionNetworkId: 'network-1',
          productModelName: 'Kem chong nang',
          thumbnailUrl: 'https://res.cloudinary.com/demo/image/upload/product.jpg',
          shippingMethods: [{ providerCode: 'GHN' }],
          createdAt: '2026-04-14T10:00:00.000Z',
        },
      ]),
    };
    const controller = new OfferController(catalogRpcService as never, { notifyShop: jest.fn() } as never);

    await expect(controller.findOffers({})).resolves.toEqual([
      {
        id: 'offer-1',
        title: 'Kem chong nang SPF50',
        price: 150000,
        currency: 'VND',
        salesMode: 'RETAIL',
        minWholesaleQty: null,
        availableQuantity: 12,
        soldQuantity: 3,
        verificationLevel: 'standard',
        offerStatus: 'active',
        shopId: 'shop-1',
        shopName: 'Shop ABC',
        shopType: 'MANUFACTURER',
        categoryId: 'category-1',
        categoryName: 'My pham',
        brandId: 'brand-1',
        productModelName: 'Kem chong nang',
        thumbnailUrl: 'https://res.cloudinary.com/demo/image/upload/product.jpg',
        createdAt: new Date('2026-04-14T10:00:00.000Z'),
      },
    ]);
  });
});
