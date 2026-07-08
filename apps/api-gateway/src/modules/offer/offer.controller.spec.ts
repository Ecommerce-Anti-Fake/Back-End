import { OfferController } from './offer.controller';
import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';

describe('OfferController', () => {
  it('exposes core offers without the legacy products prefix', () => {
    expect(Reflect.getMetadata(PATH_METADATA, OfferController)).toBe('/');
    expect(
      Reflect.getMetadata(PATH_METADATA, OfferController.prototype.createOffer),
    ).toBe('offers');
    expect(
      Reflect.getMetadata(PATH_METADATA, OfferController.prototype.updateOffer),
    ).toBe('offers/:offerId');
    expect(
      Reflect.getMetadata(PATH_METADATA, OfferController.prototype.findOffers),
    ).toBe('offers');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        OfferController.prototype.findAdminOffers,
      ),
    ).toBe('offers/admin/list-offer');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        OfferController.prototype.moderateOffer,
      ),
    ).toBe('offers/admin/:offerId/moderation-status');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        OfferController.prototype.findOfferById,
      ),
    ).toBe('offers/:id');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        OfferController.prototype.findShopOffers,
      ),
    ).toBe('shops/:shopId/offers');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        OfferController.prototype.allocateOfferBatches,
      ),
    ).toBe('offers/:offerId/batch-links');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        OfferController.prototype.findOfferBatchLinks,
      ),
    ).toBe('offers/:offerId/batch-links');
  });

  it('returns compact public offer list items for shop offers', async () => {
    const catalogRpcService = {
      findOffers: jest.fn().mockResolvedValue({
        total: 1,
        page: 2,
        pageSize: 10,
        items: [
          {
            id: 'offer-1',
            title: 'Kem chong nang SPF50',
            description: 'internal detail description',
            price: 150000,
            currency: 'VND',
            itemCondition: 'new',
            availableQuantity: 12,
            soldQuantity: 3,
            verificationLevel: 'standard',
            offerStatus: 'active',
            shopId: 'shop-1',
            shopName: 'Shop ABC',
            categoryId: 'category-1',
            brandId: 'brand-1',
            thumbnailUrl:
              'https://res.cloudinary.com/demo/image/upload/product.jpg',
            shippingMethods: [{ providerCode: 'GHN' }],
            createdAt: '2026-04-14T10:00:00.000Z',
          },
        ],
      }),
    };
    const controller = new OfferController(
      catalogRpcService as never,
      { notifyShop: jest.fn() } as never,
    );

    const result = await controller.findShopOffers('shop-1', {
      page: 2,
      pageSize: 10,
    });

    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        OfferController.prototype.findShopOffers,
      ),
    ).toBeUndefined();
    expect(catalogRpcService.findOffers).toHaveBeenCalledWith({
      shopId: 'shop-1',
      page: 2,
      pageSize: 10,
    });
    expect(result).toEqual({
      total: 1,
      page: 2,
      pageSize: 10,
      items: [
        {
          id: 'offer-1',
          title: 'Kem chong nang SPF50',
          price: 150000,
          currency: 'VND',
          availableQuantity: 12,
          soldQuantity: 3,
          verificationLevel: 'standard',
          offerStatus: 'active',
          categoryId: 'category-1',
          brandId: 'brand-1',
          thumbnailUrl:
            'https://res.cloudinary.com/demo/image/upload/product.jpg',
          createdAt: new Date('2026-04-14T10:00:00.000Z'),
        },
      ],
    });
    expect(result.items[0]).not.toHaveProperty('description');
    expect(result.items[0]).not.toHaveProperty('shopName');
    expect(result.items[0]).not.toHaveProperty('shippingMethods');
  });

  it('returns only a success acknowledgement when creating an offer', async () => {
    const catalogRpcService = {
      createOffer: jest.fn().mockResolvedValue({
        id: 'offer-1',
        title: 'Kem chong nang SPF50',
        shopId: 'shop-1',
        price: 150000,
      }),
    };
    const dashboardSseBrokerService = { notifyShop: jest.fn() };
    const controller = new OfferController(
      catalogRpcService as never,
      dashboardSseBrokerService as never,
    );

    const result = await controller.createOffer('seller-1', {
      categoryId: 'category-1',
      brandId: 'brand-1',
      title: 'Kem chong nang SPF50',
      description: 'Mo ta san pham',
      productImages: ['image-1', 'image-2'],
      price: 150000,
      currency: 'VND',
      availableQuantity: 12,
      itemCondition: 'new',
      gtin: '8930000000141',
      model: 'Kem chong nang SPF50',
      weightGrams: 450,
      lengthCm: 25,
      widthCm: 10,
      heightCm: 8,
      optionGroups: [
        {
          name: 'size',
          displayName: 'Kich thuoc',
          values: [{ text: 'S', sortOrder: 0 }],
        },
      ],
    });

    expect(catalogRpcService.createOffer).toHaveBeenCalledWith(
      expect.objectContaining({
        sellerUserId: 'seller-1',
        categoryId: 'category-1',
        brandId: 'brand-1',
        productImages: ['image-1', 'image-2'],
        gtin: '8930000000141',
        modelName: 'Kem chong nang SPF50',
        parcelWeightGrams: 450,
        parcelLengthCm: 25,
        parcelWidthCm: 10,
        parcelHeightCm: 8,
        optionGroups: [
          {
            name: 'size',
            displayName: 'Kich thuoc',
            values: [{ text: 'S', sortOrder: 0 }],
          },
        ],
      }),
    );
    expect(dashboardSseBrokerService.notifyShop).toHaveBeenCalledWith('shop-1');
    expect(result).toEqual({
      success: true,
      message: 'Offer created successfully and is pending moderation.',
    });
    expect(result).not.toHaveProperty('id');
    expect(result).not.toHaveProperty('title');
    expect(result).not.toHaveProperty('shopId');
    expect(result).not.toHaveProperty('price');
  });

  it('returns compact public offer list items', async () => {
    const catalogRpcService = {
      findOffers: jest.fn().mockResolvedValue({
        total: 1,
        page: 2,
        pageSize: 10,
        items: [
          {
            id: 'offer-1',
            title: 'Kem chong nang SPF50',
            description: 'internal detail description',
            price: 150000,
            currency: 'VND',
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
            thumbnailUrl:
              'https://res.cloudinary.com/demo/image/upload/product.jpg',
            shippingMethods: [{ providerCode: 'GHN' }],
            createdAt: '2026-04-14T10:00:00.000Z',
          },
        ],
      }),
    };
    const controller = new OfferController(
      catalogRpcService as never,
      { notifyShop: jest.fn() } as never,
    );

    await expect(
      controller.findOffers({ page: 2, pageSize: 10 }),
    ).resolves.toEqual({
      total: 1,
      page: 2,
      pageSize: 10,
      items: [
        {
          id: 'offer-1',
          title: 'Kem chong nang SPF50',
          price: 150000,
          currency: 'VND',
          availableQuantity: 12,
          soldQuantity: 3,
          verificationLevel: 'standard',
          offerStatus: 'active',
          categoryId: 'category-1',
          brandId: 'brand-1',
          thumbnailUrl:
            'https://res.cloudinary.com/demo/image/upload/product.jpg',
          createdAt: new Date('2026-04-14T10:00:00.000Z'),
        },
      ],
    });
    expect(catalogRpcService.findOffers).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
        pageSize: 10,
      }),
    );
  });

  it('uses default pagination for public offer lists', async () => {
    const catalogRpcService = {
      findOffers: jest.fn().mockResolvedValue({
        total: 0,
        page: 1,
        pageSize: 20,
        items: [],
      }),
    };
    const controller = new OfferController(
      catalogRpcService as never,
      { notifyShop: jest.fn() } as never,
    );

    await expect(controller.findOffers({})).resolves.toEqual({
      total: 0,
      page: 1,
      pageSize: 20,
      items: [],
    });
    expect(catalogRpcService.findOffers).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        pageSize: 20,
      }),
    );
  });

  it('returns public offer detail image links without shop or shipping fields', async () => {
    const catalogRpcService = {
      findOfferById: jest.fn().mockResolvedValue({
        id: 'offer-1',
        title: 'Kem chong nang SPF50',
        description: 'internal detail description',
        price: 150000,
        currency: 'VND',
        itemCondition: 'new',
        availableQuantity: 12,
        soldQuantity: 3,
        parcelWeightGrams: 500,
        parcelLengthCm: 20,
        parcelWidthCm: 12,
        parcelHeightCm: 8,
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
        distributionNodeId: null,
        distributionNetworkId: null,
        productModelName: 'Kem chong nang',
        thumbnailUrl:
          'https://res.cloudinary.com/demo/image/upload/product.jpg',
        imageUrls: [
          'https://res.cloudinary.com/demo/image/upload/product.jpg',
          'https://res.cloudinary.com/demo/image/upload/gallery-1.jpg',
          '',
          'https://res.cloudinary.com/demo/image/upload/gallery-1.jpg',
        ],
        shippingMethods: [{ providerCode: 'GHN' }],
        createdAt: new Date('2026-04-14T10:00:00.000Z'),
      }),
    };
    const controller = new OfferController(
      catalogRpcService as never,
      { notifyShop: jest.fn() } as never,
    );

    const result = await controller.findOfferById('offer-1');

    expect(result).toEqual({
      id: 'offer-1',
      title: 'Kem chong nang SPF50',
      description: 'internal detail description',
      price: 150000,
      currency: 'VND',
      itemCondition: 'new',
      availableQuantity: 12,
      soldQuantity: 3,
      parcelWeightGrams: 500,
      parcelLengthCm: 20,
      parcelWidthCm: 12,
      parcelHeightCm: 8,
      verificationLevel: 'standard',
      offerStatus: 'active',
      categoryId: 'category-1',
      categoryName: 'My pham',
      brandId: 'brand-1',
      gtin: '8938505970012',
      verificationPolicy: 'manual_review',
      distributionNodeId: null,
      distributionNetworkId: null,
      productModelName: 'Kem chong nang',
      thumbnailUrl: 'https://res.cloudinary.com/demo/image/upload/product.jpg',
      imageUrls: [
        'https://res.cloudinary.com/demo/image/upload/product.jpg',
        'https://res.cloudinary.com/demo/image/upload/gallery-1.jpg',
      ],
      createdAt: new Date('2026-04-14T10:00:00.000Z'),
    });
    expect(result).not.toHaveProperty('shopId');
    expect(result).not.toHaveProperty('shopName');
    expect(result).not.toHaveProperty('shopType');
    expect(result).not.toHaveProperty('shippingMethods');
  });
});
