import { Test, TestingModule } from '@nestjs/testing';
import { CreateOfferUseCase } from './create-offer.use-case';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';

describe('CreateOfferUseCase', () => {
  let useCase: CreateOfferUseCase;

  const productRepositoryMock = {
    findOwnedShop: jest.fn(),
    findModelById: jest.fn(),
    findCategoryById: jest.fn(),
    findApprovedShopCategoryRegistration: jest.fn(),
    createOffer: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateOfferUseCase,
        { provide: ProductRepository, useValue: productRepositoryMock },
      ],
    }).compile();

    useCase = module.get<CreateOfferUseCase>(CreateOfferUseCase);
  });

  it('should reject offer creation when shop is pending_kyc', async () => {
    productRepositoryMock.findOwnedShop.mockResolvedValueOnce({
      id: 'shop-1',
      shopStatus: 'pending_kyc',
    });

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
    ).rejects.toThrow('Shop must complete KYC approval before creating offers');
  });

  it('should reject offer creation when shop category is not approved', async () => {
    productRepositoryMock.findOwnedShop.mockResolvedValueOnce({
      id: 'shop-1',
      shopStatus: 'active',
    });
    productRepositoryMock.findModelById.mockResolvedValueOnce({
      id: 'model-1',
      categoryId: 'category-1',
    });
    productRepositoryMock.findCategoryById.mockResolvedValueOnce({
      id: 'category-1',
    });
    productRepositoryMock.findApprovedShopCategoryRegistration.mockResolvedValueOnce(null);

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
    ).rejects.toThrow('Shop category must be approved before creating offers in this category');
  });
});
