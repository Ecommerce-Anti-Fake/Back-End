import { toOfferResponse } from './offers.mapper';

describe('toOfferResponse option groups', () => {
  it('maps option values to the public media projection', () => {
    const response = toOfferResponse({
      id: 'offer-1',
      title: 'Offer',
      description: 'Desc',
      price: 100,
      currency: 'VND',
      itemCondition: 'new',
      availableQuantity: 1,
      offerStatus: 'active',
      moderationStatus: 'approved',
      moderationReason: null,
      sellerUserId: 'seller-1',
      shopId: 'shop-1',
      categoryId: 'category-1',
      brandId: 'brand-1',
      modelName: 'Model',
      gtin: null,
      verificationPolicy: 'manual_review',
      distributionNodeId: null,
      parcelWeightGrams: null,
      parcelLengthCm: null,
      parcelWidthCm: null,
      parcelHeightCm: null,
      createdAt: new Date('2026-07-08T00:00:00.000Z'),
      shop: { shopName: 'Shop', registrationType: 'NORMAL' },
      category: { name: 'Category' },
      media: [],
      optionGroups: [
        {
          id: 'group-1',
          name: 'color',
          displayName: 'Mau sac',
          sortOrder: 0,
          values: [
            {
              id: 'value-1',
              text: 'Do',
              sortOrder: 0,
              mediaAsset: {
                id: 'media-1',
                secureUrl: 'https://cdn.test/red.jpg',
              },
            },
          ],
        },
      ],
      variants: [
        {
          id: 'variant-1',
          offerId: 'offer-1',
          sku: 'RED-M',
          price: 120000,
          availableQuantity: 5,
          isActive: true,
          createdAt: new Date('2026-07-08T01:00:00.000Z'),
          updatedAt: new Date('2026-07-08T01:00:00.000Z'),
          mediaAsset: {
            id: 'media-2',
            secureUrl: 'https://cdn.test/red-m.jpg',
          },
          values: [
            {
              optionValue: {
                id: 'value-1',
                text: 'Do',
                optionGroup: {
                  id: 'group-1',
                  name: 'color',
                  displayName: 'Mau sac',
                },
              },
            },
          ],
        },
      ],
    } as never);

    expect(response.optionGroups).toEqual([
      {
        id: 'group-1',
        name: 'color',
        displayName: 'Mau sac',
        sortOrder: 0,
        values: [
          {
            id: 'value-1',
            text: 'Do',
            sortOrder: 0,
            mediaAsset: {
              id: 'media-1',
              secureUrl: 'https://cdn.test/red.jpg',
            },
          },
        ],
      },
    ]);
    expect(response.variants).toEqual([
      {
        id: 'variant-1',
        offerId: 'offer-1',
        sku: 'RED-M',
        priceOverride: 120000,
        availableQuantity: 5,
        isActive: true,
        mediaAsset: { id: 'media-2', secureUrl: 'https://cdn.test/red-m.jpg' },
        optionValues: [
          {
            id: 'value-1',
            text: 'Do',
            optionGroup: {
              id: 'group-1',
              name: 'color',
              displayName: 'Mau sac',
            },
          },
        ],
        createdAt: new Date('2026-07-08T01:00:00.000Z'),
        updatedAt: new Date('2026-07-08T01:00:00.000Z'),
      },
    ]);
  });
});
