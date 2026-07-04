import { Test, TestingModule } from '@nestjs/testing';
import { CreateOfferUseCase } from './create-offer.use-case';
import { OffersRepository } from '../../infrastructure/persistence/offers.repository';
import { MediaService } from '@media';

describe('CreateOfferUseCase', () => {
  let useCase: CreateOfferUseCase;

  const productRepositoryMock = {
    findOwnedShop: jest.fn(),
    findShopByOwnerUserId: jest.fn(),
    // findModelById removed as ProductModel deprecated
    findModelById: jest.fn(),
    findBrandById: jest.fn(),
    findCategoryById: jest.fn(),
    findApprovedShopCategoryRegistration: jest.fn(),
    findOwnedDistributionNode: jest.fn(),
    createProductModel: jest.fn(),
    createOffer: jest.fn(),
    createOfferMedia: jest.fn(),
  };

  const mediaServiceMock = {
    uploadCloudinaryBuffer: jest.fn(),
    createCloudinaryAsset: jest.fn(),
    deleteCloudinaryAsset: jest.fn(),
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
    return [
      {
        buffer: Buffer.from('image-bytes'),
        mimetype: 'image/jpeg',
        originalname: 'product.jpg',
        size: 11,
      },
    ];
  }

  function mockSuccessfulImagePersistence() {
    mediaServiceMock.uploadCloudinaryBuffer.mockResolvedValueOnce({
      publicId: 'offers/offer-1/media/user-1-1',
      secureUrl:
        'https://res.cloudinary.com/demo/image/upload/v1/offers/offer-1/media/user-1-1.jpg',
    });
    mediaServiceMock.createCloudinaryAsset.mockResolvedValueOnce({
      id: 'media-asset-1',
    });
    productRepositoryMock.createOfferMedia.mockResolvedValueOnce({
      id: 'offer-media-1',
    });
  }

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
      verificationLevel: 'standard',
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
        offerStatus: 'inactive',
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
      verificationLevel: 'standard',
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
      title: 'Offer first product',
      description: 'Desc',
      price: 100000,
      availableQuantity: 10,
      productImages: productImages(),
    });

    expect(productRepositoryMock.createProductModel).not.toHaveBeenCalled();
    expect(productRepositoryMock.createOffer).toHaveBeenCalledWith(
      expect.objectContaining({
        brandId: 'brand-1',
        modelName: 'Offer first product',
        gtin: null,
        verificationPolicy: 'manual_review',
      }),
    );
    expect(mediaServiceMock.uploadCloudinaryBuffer).toHaveBeenCalledWith({
      buffer: Buffer.from('image-bytes'),
      folder: 'offers/offer-1/media',
      requesterUserId: 'user-1',
      assetType: 'IMAGE',
      mimeType: 'image/jpeg',
      sequence: 1,
    });
    expect(productRepositoryMock.createOfferMedia).toHaveBeenCalledWith({
      offerId: 'offer-1',
      mediaAssetId: 'media-asset-1',
      mediaType: 'thumbnail',
      fileUrl:
        'https://res.cloudinary.com/demo/image/upload/v1/offers/offer-1/media/user-1-1.jpg',
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
      verificationLevel: 'standard',
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
});
