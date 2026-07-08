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
      verificationLevel: 'standard',
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
  });
});
