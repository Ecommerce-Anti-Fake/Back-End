import { Test, TestingModule } from '@nestjs/testing';
import { CreateOfferUseCase } from './create-offer.use-case';
import { OffersRepository } from '../../infrastructure/persistence/offers.repository';

describe('CreateOfferUseCase', () => {
  let useCase: CreateOfferUseCase;

  const productRepositoryMock = {
    findOwnedShop: jest.fn(),
    // findModelById removed as ProductModel deprecated
    findModelById: jest.fn(),
    findBrandById: jest.fn(),
    findCategoryById: jest.fn(),
    findApprovedShopCategoryRegistration: jest.fn(),
    findOwnedDistributionNode: jest.fn(),
    findActiveShippingCarriersByCodes: jest.fn(),
    createProductModel: jest.fn(),
    createOffer: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    productRepositoryMock.findActiveShippingCarriersByCodes.mockImplementation(
      async (codes: string[]) => codes.map((code) => ({ code })),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateOfferUseCase,
        { provide: OffersRepository, useValue: productRepositoryMock },
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
      }),
    ).rejects.toThrow(
      'Shop category must be approved before creating offers in this category',
    );
  });

  it('should reject wholesale offer creation for normal shops', async () => {
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

    await expect(
      useCase.execute({
        sellerUserId: 'user-1',
        shopId: 'shop-1',
        categoryId: 'category-1',
        brandId: 'brand-1',
        title: 'Wholesale Offer',
        description: 'Desc',
        price: 100000,
        availableQuantity: 10,
        salesMode: 'WHOLESALE',
        minWholesaleQty: 10,
      }),
    ).rejects.toThrow(
      'Only manufacturer or distributor shops can create wholesale offers',
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
      salesMode: 'WHOLESALE',
      minWholesaleQty: 5,
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
      salesMode: 'WHOLESALE',
      minWholesaleQty: 5,
      offerStatus: 'draft',
    });

    expect(productRepositoryMock.createOffer).toHaveBeenCalledWith(
      expect.objectContaining({
        brandId: 'brand-1',
        distributionNodeId: 'node-1',
        modelName: 'Resale draft',
        gtin: null,
        verificationPolicy: 'manual_review',
        offerStatus: 'draft',
        salesMode: 'WHOLESALE',
        shippingProviderCodes: ['SELF_DELIVERY'],
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
      salesMode: 'RETAIL',
      minWholesaleQty: null,
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

    await useCase.execute({
      sellerUserId: 'user-1',
      shopId: 'shop-1',
      categoryId: 'category-1',
      brandId: 'brand-1',
      title: 'Offer first product',
      description: 'Desc',
      price: 100000,
      availableQuantity: 10,
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
  });

  it('should reject unknown shipping providers', async () => {
    mockActiveApprovedShop();
    productRepositoryMock.findActiveShippingCarriersByCodes.mockResolvedValueOnce(
      [{ code: 'SELF_DELIVERY' }],
    );

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
        shippingProviderCodes: ['SELF_DELIVERY', 'UNKNOWN'],
      }),
    ).rejects.toThrow('One or more shipping providers are invalid');
  });
});
