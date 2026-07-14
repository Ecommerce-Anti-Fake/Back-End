import { Test, TestingModule } from '@nestjs/testing';
import { MediaService } from '@media';
import { CreateOfferUseCase } from './create-offer.use-case';
import { OffersRepository } from '../../infrastructure/persistence/offers.repository';

describe('CreateOfferUseCase', () => {
  let useCase: CreateOfferUseCase;

  const productRepositoryMock = {
    findOwnedShop: jest.fn(),
    findShopByOwnerUserId: jest.fn(),
    // findModelById removed as ProductModel deprecated
    findModelById: jest.fn(),
    findBrandById: jest.fn(),
    findBrandByName: jest.fn(),
    createBrand: jest.fn(),
    findCategoryById: jest.fn(),
    findApprovedShopCategoryRegistration: jest.fn(),
    findOwnedDistributionNode: jest.fn(),
    createProductModel: jest.fn(),
    createOffer: jest.fn(),
    createOfferMedia: jest.fn(),
    findOwnedMediaAssets: jest.fn(),
    createOfferWithSalesOptions: jest.fn(),
  };
  const mediaServiceMock = {
    uploadCloudinaryBuffer: jest.fn(),
    createCloudinaryAsset: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateOfferUseCase,
        { provide: OffersRepository, useValue: productRepositoryMock },
        { provide: MediaService, useValue: mediaServiceMock },
      ],
    }).compile();

    useCase = module.get<CreateOfferUseCase>(CreateOfferUseCase);
  });

  function mockActiveApprovedShop() {
    productRepositoryMock.findOwnedShop.mockResolvedValueOnce({
      id: 'shop-1',
      shopStatus: 'verified',
      registrationType: 'NORMAL',
    });
    productRepositoryMock.findBrandById.mockResolvedValueOnce({
      id: 'brand-1',
    });
    productRepositoryMock.findCategoryById.mockResolvedValueOnce({
      id: 'category-1',
    });
    productRepositoryMock.findApprovedShopCategoryRegistration.mockResolvedValueOnce(
      { id: 'registration-1' },
    );
  }

  function productImages() {
    return ['https://cdn.example.com/product.jpg'];
  }

  function mockOfferCreateResult(brandId: string) {
    return {
      id: 'offer-1',
      title: 'Offer 1',
      description: 'Desc',
      price: 100000,
      currency: 'VND',
      itemCondition: 'new',
      availableQuantity: 10,
      offerStatus: 'active',
      moderationStatus: 'pending',
      sellerUserId: 'user-1',
      shopId: 'shop-1',
      categoryId: 'category-1',
      brandId,
      modelName: 'Offer 1',
      gtin: null,
      verificationPolicy: 'manual_review',
      distributionNodeId: null,
      createdAt: new Date('2026-07-09T00:00:00.000Z'),
      shop: { shopName: 'Shop' },
      category: { name: 'Category' },
      distributionNode: null,
      media: [],
    };
  }

  function mockSuccessfulImagePersistence() {
    productRepositoryMock.createOfferMedia.mockResolvedValueOnce({
      id: 'offer-media-1',
    });
  }

  it('prioritizes brandId when both brand inputs are provided', async () => {
    mockActiveApprovedShop();
    productRepositoryMock.createOffer.mockResolvedValueOnce(
      mockOfferCreateResult('brand-1'),
    );
    mockSuccessfulImagePersistence();

    await useCase.execute({
      sellerUserId: 'user-1',
      shopId: 'shop-1',
      categoryId: 'category-1',
      brandId: 'brand-1',
      brandName: 'Seller-entered fallback',
      title: 'Offer 1',
      description: 'Desc',
      price: 100000,
      availableQuantity: 10,
      productImages: productImages(),
    });

    expect(productRepositoryMock.findBrandById).toHaveBeenCalledWith('brand-1');
    expect(productRepositoryMock.findBrandByName).not.toHaveBeenCalled();
    expect(productRepositoryMock.createBrand).not.toHaveBeenCalled();
  });

  it('reuses an existing brand by case-insensitive name when creating an offer', async () => {
    mockActiveApprovedShop();
    productRepositoryMock.findBrandByName.mockResolvedValueOnce({
      id: 'brand-existing',
    });
    productRepositoryMock.createOffer.mockResolvedValueOnce(
      mockOfferCreateResult('brand-existing'),
    );
    mockSuccessfulImagePersistence();

    await useCase.execute({
      sellerUserId: 'user-1',
      shopId: 'shop-1',
      categoryId: 'category-1',
      brandName: '  Nike  ',
      title: 'Offer 1',
      description: 'Desc',
      price: 100000,
      availableQuantity: 10,
      productImages: productImages(),
    });

    expect(productRepositoryMock.findBrandByName).toHaveBeenCalledWith('Nike');
    expect(productRepositoryMock.createBrand).not.toHaveBeenCalled();
    expect(productRepositoryMock.createOffer).toHaveBeenCalledWith(
      expect.objectContaining({
        brandId: 'brand-existing',
        availableQuantity: 10,
        distributionNodeId: null,
      }),
    );
  });

  it('creates a seller-declared brand when the name does not exist', async () => {
    mockActiveApprovedShop();
    productRepositoryMock.findBrandByName.mockResolvedValueOnce(null);
    productRepositoryMock.createBrand.mockResolvedValueOnce({
      id: 'brand-new',
    });
    productRepositoryMock.createOffer.mockResolvedValueOnce(
      mockOfferCreateResult('brand-new'),
    );
    mockSuccessfulImagePersistence();

    await useCase.execute({
      sellerUserId: 'user-1',
      shopId: 'shop-1',
      categoryId: 'category-1',
      brandName: 'No brand',
      title: 'Offer 1',
      description: 'Desc',
      price: 100000,
      availableQuantity: 10,
      productImages: productImages(),
    });

    expect(productRepositoryMock.createBrand).toHaveBeenCalledWith({
      name: 'No brand',
      registryStatus: 'seller_declared',
    });
    expect(productRepositoryMock.createOffer).toHaveBeenCalledWith(
      expect.objectContaining({ brandId: 'brand-new' }),
    );
  });

  it('rejects a blank brand name', async () => {
    mockActiveApprovedShop();

    await expect(
      useCase.execute({
        sellerUserId: 'user-1',
        shopId: 'shop-1',
        categoryId: 'category-1',
        brandName: '   ',
        title: 'Offer 1',
        description: 'Desc',
        price: 100000,
        availableQuantity: 10,
        productImages: productImages(),
      }),
    ).rejects.toThrow('Brand ID or brand name is required');

    expect(productRepositoryMock.findBrandByName).not.toHaveBeenCalled();
    expect(productRepositoryMock.createOffer).not.toHaveBeenCalled();
  });

  it('uploads a product data URL and persists its Cloudinary asset as the thumbnail', async () => {
    mockActiveApprovedShop();
    productRepositoryMock.createOffer.mockResolvedValueOnce({
      id: 'offer-1',
      title: 'Offer 1',
      description: 'Desc',
      price: 100000,
      currency: 'VND',
      itemCondition: 'new',
      availableQuantity: 10,
      offerStatus: 'active',
      moderationStatus: 'pending',
      sellerUserId: 'user-1',
      shopId: 'shop-1',
      categoryId: 'category-1',
      brandId: 'brand-1',
      modelName: 'Offer 1',
      gtin: null,
      verificationPolicy: 'manual_review',
      distributionNodeId: null,
      createdAt: new Date('2026-07-08T00:00:00.000Z'),
      shop: { shopName: 'Shop' },
      category: { name: 'Category' },
      distributionNode: null,
      media: [],
    });
    mediaServiceMock.uploadCloudinaryBuffer.mockResolvedValueOnce({
      publicId: 'offers/user-1-1',
      secureUrl:
        'https://res.cloudinary.com/demo/image/upload/offers/user-1-1.png',
    });
    mediaServiceMock.createCloudinaryAsset.mockResolvedValueOnce({
      id: 'asset-1',
    });
    mockSuccessfulImagePersistence();

    await useCase.execute({
      sellerUserId: 'user-1',
      shopId: 'shop-1',
      categoryId: 'category-1',
      brandId: 'brand-1',
      title: 'Offer 1',
      description: 'Desc',
      price: 100000,
      availableQuantity: 10,
      productImages: ['data:image/png;base64,aGVsbG8='],
    });

    expect(mediaServiceMock.uploadCloudinaryBuffer).toHaveBeenCalledWith({
      buffer: Buffer.from('hello'),
      folder: 'offers/media',
      requesterUserId: 'user-1',
      assetType: 'IMAGE',
      mimeType: 'image/png',
      sequence: 1,
    });
    expect(mediaServiceMock.createCloudinaryAsset).toHaveBeenCalledWith({
      ownerUserId: 'user-1',
      assetType: 'IMAGE',
      resourceType: 'PRODUCT_IMAGE',
      publicId: 'offers/user-1-1',
      secureUrl:
        'https://res.cloudinary.com/demo/image/upload/offers/user-1-1.png',
      mimeType: 'image/png',
      folder: 'offers/media',
    });
    expect(productRepositoryMock.createOfferMedia).toHaveBeenCalledWith({
      offerId: 'offer-1',
      mediaAssetId: 'asset-1',
      mediaType: 'thumbnail',
      fileUrl:
        'https://res.cloudinary.com/demo/image/upload/offers/user-1-1.png',
      phash: null,
    });
  });

  it('rejects malformed product data URLs before uploading media', async () => {
    mockActiveApprovedShop();

    await expect(
      useCase.execute({
        sellerUserId: 'user-1',
        shopId: 'shop-1',
        categoryId: 'category-1',
        brandId: 'brand-1',
        title: 'Offer 1',
        description: 'Desc',
        price: 100000,
        availableQuantity: 10,
        productImages: ['data:image/svg+xml;base64,PHN2Zz4='],
      }),
    ).rejects.toThrow('Product image Data URL is invalid');

    expect(mediaServiceMock.uploadCloudinaryBuffer).not.toHaveBeenCalled();
    expect(productRepositoryMock.createOffer).not.toHaveBeenCalled();
  });

  it('should reject non-positive offer price', async () => {
    mockActiveApprovedShop();

    await expect(
      useCase.execute({
        sellerUserId: 'user-1',
        shopId: 'shop-1',
        categoryId: 'category-1',
        brandId: 'brand-1',
        title: 'Offer 1',
        description: 'Desc',
        price: 0,
        availableQuantity: 10,
        productImages: productImages(),
      }),
    ).rejects.toThrow('Price must be greater than 0');
  });

  it('should reject zero available quantity', async () => {
    mockActiveApprovedShop();

    await expect(
      useCase.execute({
        sellerUserId: 'user-1',
        shopId: 'shop-1',
        categoryId: 'category-1',
        brandId: 'brand-1',
        title: 'Offer 1',
        description: 'Desc',
        price: 100000,
        availableQuantity: 0,
        productImages: productImages(),
      }),
    ).rejects.toThrow('Available quantity must be at least 1');
  });

  it('should reject offer creation when shop is pending_kyc', async () => {
    productRepositoryMock.findOwnedShop.mockResolvedValueOnce({
      id: 'shop-1',
      shopStatus: 'pending_kyc',
      registrationType: 'NORMAL',
    });

    await expect(
      useCase.execute({
        sellerUserId: 'user-1',
        shopId: 'shop-1',
        categoryId: 'category-1',
        brandId: 'brand-1',
        title: 'Offer 1',
        description: 'Desc',
        price: 100000,
        availableQuantity: 10,
        productImages: productImages(),
      }),
    ).rejects.toThrow('Shop must complete KYC approval before creating offers');
  });

  it('should reject offer creation when shop category is not approved', async () => {
    productRepositoryMock.findOwnedShop.mockResolvedValueOnce({
      id: 'shop-1',
      shopStatus: 'verified',
      registrationType: 'NORMAL',
    });
    productRepositoryMock.findBrandById.mockResolvedValueOnce({
      id: 'brand-1',
    });
    productRepositoryMock.findCategoryById.mockResolvedValueOnce({
      id: 'category-1',
    });
    productRepositoryMock.findApprovedShopCategoryRegistration.mockResolvedValueOnce(
      null,
    );

    await expect(
      useCase.execute({
        sellerUserId: 'user-1',
        shopId: 'shop-1',
        categoryId: 'category-1',
        productModelId: 'model-1',
        title: 'Offer 1',
        description: 'Desc',
        price: 100000,
        availableQuantity: 10,
        productImages: productImages(),
      }),
    ).rejects.toThrow(
      'Shop category must be approved before creating offers in this category',
    );
  });

  it('should create a draft distributor resale offer for an active distribution node', async () => {
    productRepositoryMock.findOwnedShop.mockResolvedValueOnce({
      id: 'shop-1',
      shopStatus: 'verified',
      registrationType: 'DISTRIBUTOR',
    });
    productRepositoryMock.findCategoryById.mockResolvedValueOnce({
      id: 'category-1',
    });
    productRepositoryMock.findApprovedShopCategoryRegistration.mockResolvedValueOnce(
      { id: 'registration-1' },
    );
    productRepositoryMock.findBrandById.mockResolvedValueOnce({
      id: 'brand-1',
    });
    productRepositoryMock.findOwnedDistributionNode.mockResolvedValueOnce({
      id: 'node-1',
      relationshipStatus: 'ACTIVE',
    });
    productRepositoryMock.createOffer.mockResolvedValueOnce({
      id: 'offer-1',
      title: 'Resale draft',
      description: 'Draft from received inventory',
      price: 100000,
      currency: 'VND',
      itemCondition: 'new',
      availableQuantity: 20,
      offerStatus: 'draft',
      shopId: 'shop-1',
      categoryId: 'category-1',
      brandId: 'brand-1',
      productModelId: 'model-1',
      modelName: 'Model 1',
      gtin: 'GTIN-1',
      verificationPolicy: 'manual_review',
      distributionNodeId: 'node-1',
      createdAt: new Date('2026-05-19T00:00:00.000Z'),
      shop: { shopName: 'Distributor shop' },
      category: { name: 'Category' },
      productModel: { modelName: 'Model', brandId: 'brand-1' },
      distributionNode: { networkId: 'network-1' },
      media: [],
    });
    mockSuccessfulImagePersistence();

    await useCase.execute({
      sellerUserId: 'user-1',
      shopId: 'shop-1',
      categoryId: 'category-1',
      brandId: 'brand-1',
      distributionNodeId: 'node-1',
      title: 'Resale draft',
      description: 'Draft from received inventory',
      price: 100000,
      availableQuantity: 20,
      offerStatus: 'draft',
      productImages: productImages(),
    });

    expect(productRepositoryMock.createOffer).toHaveBeenCalledWith(
      expect.objectContaining({
        brandId: 'brand-1',
        distributionNodeId: 'node-1',
        modelName: 'Resale draft',
        gtin: null,
        verificationPolicy: 'manual_review',
        offerStatus: 'draft',
      }),
    );
  });

  it('should create an offer identity snapshot without productModelId', async () => {
    productRepositoryMock.findOwnedShop.mockResolvedValueOnce({
      id: 'shop-1',
      shopStatus: 'verified',
      registrationType: 'NORMAL',
    });
    productRepositoryMock.findCategoryById.mockResolvedValueOnce({
      id: 'category-1',
    });
    productRepositoryMock.findApprovedShopCategoryRegistration.mockResolvedValueOnce(
      { id: 'registration-1' },
    );
    productRepositoryMock.findBrandById.mockResolvedValueOnce({
      id: 'brand-1',
    });
    productRepositoryMock.createOffer.mockResolvedValueOnce({
      id: 'offer-1',
      title: 'Offer first product',
      description: 'Desc',
      price: 100000,
      currency: 'VND',
      itemCondition: 'new',
      availableQuantity: 10,
      offerStatus: 'active',
      shopId: 'shop-1',
      categoryId: 'category-1',
      brandId: 'brand-1',
      productModelId: null,
      modelName: 'Offer first product',
      gtin: null,
      verificationPolicy: 'manual_review',
      distributionNodeId: null,
      createdAt: new Date('2026-05-27T00:00:00.000Z'),
      shop: { shopName: 'Seller shop' },
      category: { name: 'Category' },
      productModel: null,
      distributionNode: null,
      media: [],
    });
    mockSuccessfulImagePersistence();

    await useCase.execute({
      sellerUserId: 'user-1',
      shopId: 'shop-1',
      categoryId: 'category-1',
      brandId: 'brand-1',
      modelName: 'Kem chong nang SPF50',
      gtin: '8930000000141',
      title: 'Offer first product',
      description: 'Desc',
      price: 100000,
      availableQuantity: 10,
      parcelWeightGrams: 450,
      parcelLengthCm: 25,
      parcelWidthCm: 10,
      parcelHeightCm: 8,
      productImages: productImages(),
    });

    expect(productRepositoryMock.createProductModel).not.toHaveBeenCalled();
    expect(productRepositoryMock.createOffer).toHaveBeenCalledWith(
      expect.objectContaining({
        brandId: 'brand-1',
        modelName: 'Kem chong nang SPF50',
        gtin: '8930000000141',
        verificationPolicy: 'manual_review',
        parcelWeightGrams: 450,
        parcelLengthCm: 25,
        parcelWidthCm: 10,
        parcelHeightCm: 8,
      }),
    );
    expect(productRepositoryMock.createOfferMedia).toHaveBeenCalledWith({
      offerId: 'offer-1',
      mediaAssetId: null,
      mediaType: 'thumbnail',
      fileUrl: 'https://cdn.example.com/product.jpg',
      phash: null,
    });
  });

  it('should resolve the current seller shop when shopId is omitted', async () => {
    productRepositoryMock.findShopByOwnerUserId.mockResolvedValueOnce({
      id: 'shop-1',
      shopStatus: 'verified',
      registrationType: 'NORMAL',
    });
    productRepositoryMock.findCategoryById.mockResolvedValueOnce({
      id: 'category-1',
    });
    productRepositoryMock.findApprovedShopCategoryRegistration.mockResolvedValueOnce(
      { id: 'registration-1' },
    );
    productRepositoryMock.findBrandById.mockResolvedValueOnce({
      id: 'brand-1',
    });
    productRepositoryMock.createOffer.mockResolvedValueOnce({
      id: 'offer-1',
      title: 'Offer first product',
      description: 'Desc',
      price: 100000,
      currency: 'VND',
      itemCondition: 'new',
      availableQuantity: 10,
      offerStatus: 'active',
      shopId: 'shop-1',
      categoryId: 'category-1',
      brandId: 'brand-1',
      productModelId: null,
      modelName: 'Offer first product',
      gtin: null,
      verificationPolicy: 'manual_review',
      distributionNodeId: null,
      createdAt: new Date('2026-05-27T00:00:00.000Z'),
      shop: { shopName: 'Seller shop' },
      category: { name: 'Category' },
      productModel: null,
      distributionNode: null,
      media: [],
    });
    mockSuccessfulImagePersistence();

    await useCase.execute({
      sellerUserId: 'user-1',
      categoryId: 'category-1',
      brandId: 'brand-1',
      title: 'Offer first product',
      description: 'Desc',
      price: 100000,
      availableQuantity: 10,
      productImages: productImages(),
    });

    expect(productRepositoryMock.findShopByOwnerUserId).toHaveBeenCalledWith(
      'user-1',
    );
    expect(productRepositoryMock.createOffer).toHaveBeenCalledWith(
      expect.objectContaining({ shopId: 'shop-1' }),
    );
  });

  it('should reject offer creation without product images', async () => {
    await expect(
      useCase.execute({
        sellerUserId: 'user-1',
        categoryId: 'category-1',
        brandId: 'brand-1',
        title: 'Offer first product',
        description: 'Desc',
        price: 100000,
        availableQuantity: 10,
      }),
    ).rejects.toThrow('At least one product image is required');
  });

  it('rejects duplicate option group display names', async () => {
    await expect(
      useCase.execute({
        sellerUserId: 'user-1',
        categoryId: 'category-1',
        brandId: 'brand-1',
        title: 'Offer',
        description: 'Desc',
        price: 100,
        availableQuantity: 1,
        productImages: productImages(),
        optionGroups: [
          { displayName: 'Size', values: [{ text: 'S' }] },
          { displayName: 'Size', values: [{ text: 'M' }] },
        ],
      }),
    ).rejects.toThrow('Option group display names must be unique');
  });

  it('rejects duplicate option values in a group', async () => {
    await expect(
      useCase.execute({
        sellerUserId: 'user-1',
        categoryId: 'category-1',
        brandId: 'brand-1',
        title: 'Offer',
        description: 'Desc',
        price: 100,
        availableQuantity: 1,
        productImages: productImages(),
        optionGroups: [
          {
            displayName: 'Size',
            values: [{ text: 'S' }, { text: 'S' }],
          },
        ],
      }),
    ).rejects.toThrow('Option value texts must be unique within a group');
  });

  it('creates the offer and sales options through the transactional repository path', async () => {
    mockActiveApprovedShop();
    mediaServiceMock.uploadCloudinaryBuffer.mockResolvedValueOnce({
      publicId: 'option-red',
      secureUrl: 'https://cdn.example.com/red.png',
    });
    mediaServiceMock.createCloudinaryAsset.mockResolvedValueOnce({
      id: 'option-media-1',
    });
    productRepositoryMock.createOfferWithSalesOptions.mockResolvedValueOnce({
      id: 'offer-1',
      title: 'Offer',
      description: 'Desc',
      price: 100,
      currency: 'VND',
      itemCondition: 'new',
      availableQuantity: 1,
      offerStatus: 'active',
      moderationStatus: 'pending',
      moderationReason: null,
      shopId: 'shop-1',
      categoryId: 'category-1',
      brandId: 'brand-1',
      modelName: 'Offer',
      gtin: null,
      verificationPolicy: 'manual_review',
      distributionNodeId: null,
      createdAt: new Date('2026-07-08T00:00:00.000Z'),
      shop: { shopName: 'Shop', registrationType: 'NORMAL' },
      category: { name: 'Category' },
      distributionNode: null,
      media: [],
      optionGroups: [],
    });

    await useCase.execute({
      sellerUserId: 'user-1',
      shopId: 'shop-1',
      categoryId: 'category-1',
      brandId: 'brand-1',
      title: 'Offer',
      description: 'Desc',
      price: 100,
      availableQuantity: 1,
      productImages: productImages(),
      optionGroups: [
        {
          displayName: 'Mau sac',
          values: [{ text: 'Do', image: 'data:image/png;base64,RG8=' }],
        },
      ],
    });

    expect(
      productRepositoryMock.createOfferWithSalesOptions,
    ).toHaveBeenCalledWith({
      offer: expect.objectContaining({
        sellerUserId: 'user-1',
        shopId: 'shop-1',
        offerStatus: 'active',
      }),
      productImages: [
        {
          fileUrl: 'https://cdn.example.com/product.jpg',
          mediaAssetId: null,
        },
      ],
      optionGroups: [
        {
          displayName: 'Mau sac',
          values: [{ text: 'Do', mediaAssetId: 'option-media-1', sortOrder: 0 }],
        },
      ],
    });
    expect(productRepositoryMock.createOffer).not.toHaveBeenCalled();
    expect(productRepositoryMock.createOfferMedia).not.toHaveBeenCalled();
  });

  it('uploads an option value image and accepts zero offer price and stock', async () => {
    mockActiveApprovedShop();
    mediaServiceMock.uploadCloudinaryBuffer.mockResolvedValueOnce({
      publicId: 'option-black',
      secureUrl: 'https://cdn.example.com/black.png',
    });
    mediaServiceMock.createCloudinaryAsset.mockResolvedValueOnce({
      id: 'option-media-1',
    });
    productRepositoryMock.createOfferWithSalesOptions.mockResolvedValueOnce({
      ...mockOfferCreateResult('brand-1'),
      price: 0,
      availableQuantity: 0,
      optionGroups: [],
    });

    await useCase.execute({
      sellerUserId: 'user-1',
      shopId: 'shop-1',
      categoryId: 'category-1',
      brandId: 'brand-1',
      title: 'Offer',
      description: 'Desc',
      price: 0,
      availableQuantity: 0,
      productImages: productImages(),
      optionGroups: [
        {
          displayName: 'Mau sac',
          values: [
            { text: 'Den', image: 'data:image/png;base64,YmxhY2s=' },
          ],
        },
      ],
    });

    expect(mediaServiceMock.uploadCloudinaryBuffer).toHaveBeenCalledWith(
      expect.objectContaining({
        folder: 'offers/options',
        requesterUserId: 'user-1',
        mimeType: 'image/png',
      }),
    );
    expect(
      productRepositoryMock.createOfferWithSalesOptions,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        offer: expect.objectContaining({ price: 0, availableQuantity: 0 }),
        optionGroups: [
          {
            displayName: 'Mau sac',
            values: [
              {
                text: 'Den',
                mediaAssetId: 'option-media-1',
                sortOrder: 0,
              },
            ],
          },
        ],
      }),
    );
  });

});
