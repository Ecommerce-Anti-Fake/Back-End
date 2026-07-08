import { Test, TestingModule } from '@nestjs/testing';
import { OffersRepository } from '../../infrastructure/persistence/offers.repository';
import { UpdateOfferUseCase } from './update-offer.use-case';

describe('UpdateOfferUseCase', () => {
  let useCase: UpdateOfferUseCase;

  const productRepositoryMock = {
    findOwnedOffer: jest.fn(),
    updateOwnedOffer: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateOfferUseCase,
        { provide: OffersRepository, useValue: productRepositoryMock },
      ],
    }).compile();

    useCase = module.get<UpdateOfferUseCase>(UpdateOfferUseCase);
  });

  it('should reject invalid offer status', async () => {
    productRepositoryMock.findOwnedOffer.mockResolvedValueOnce({
      id: 'offer-1',
    });

    await expect(
      useCase.execute({
        offerId: 'offer-1',
        sellerUserId: 'user-1',
        offerStatus: 'archived',
      } as never),
    ).rejects.toThrow('Offer status must be active, inactive, or draft');
  });

  it('should reject resale draft publish when attached batch stock is insufficient', async () => {
    productRepositoryMock.findOwnedOffer.mockResolvedValueOnce(
      createOwnedOffer({
        batchLinks: [
          {
            allocatedQuantity: 3,
            batch: {
              distributionNodeId: 'node-1',
              sourceType: 'WHOLESALE_ORDER',
            },
          },
        ],
      }),
    );

    await expect(
      useCase.execute({
        offerId: 'offer-1',
        sellerUserId: 'user-1',
        availableQuantity: 5,
        offerStatus: 'active',
      }),
    ).rejects.toThrow(
      'Resale draft must have enough attached batch stock before publishing',
    );
    expect(productRepositoryMock.updateOwnedOffer).not.toHaveBeenCalled();
  });

  it('should reject resale draft publish when distribution node is inactive', async () => {
    productRepositoryMock.findOwnedOffer.mockResolvedValueOnce(
      createOwnedOffer({
        distributionNode: {
          id: 'node-1',
          relationshipStatus: 'SUSPENDED',
          shop: {
            shopStatus: 'verified',
          },
        },
      }),
    );

    await expect(
      useCase.execute({
        offerId: 'offer-1',
        sellerUserId: 'user-1',
        offerStatus: 'active',
      }),
    ).rejects.toThrow(
      'Resale draft distribution node must be active before publishing',
    );
    expect(productRepositoryMock.updateOwnedOffer).not.toHaveBeenCalled();
  });

  it('should publish eligible resale draft offer', async () => {
    productRepositoryMock.findOwnedOffer.mockResolvedValueOnce(
      createOwnedOffer(),
    );
    productRepositoryMock.updateOwnedOffer.mockResolvedValueOnce({
      ...createOwnedOffer(),
      offerStatus: 'active',
      price: { toString: () => '120000' },
      createdAt: new Date('2026-05-19T00:00:00.000Z'),
      category: { name: 'Category' },
      productModel: { modelName: 'Model' },
      media: [],
    });

    await useCase.execute({
      offerId: 'offer-1',
      sellerUserId: 'user-1',
      offerStatus: 'active',
    });

    expect(productRepositoryMock.updateOwnedOffer).toHaveBeenCalledWith(
      'offer-1',
      'user-1',
      {
        offerStatus: 'active',
      },
    );
  });
});

function createOwnedOffer(overrides: Record<string, unknown> = {}) {
  return {
    id: 'offer-1',
    title: 'Resale draft',
    description: 'Draft from received inventory',
    price: { toString: () => '120000' },
    currency: 'VND',
    itemCondition: 'new',
    availableQuantity: 5,
    offerStatus: 'draft',
    shopId: 'shop-1',
    categoryId: 'category-1',
    productModelId: 'model-1',
    distributionNodeId: 'node-1',
    shop: {
      id: 'shop-1',
      shopName: 'Distributor shop',
      shopStatus: 'verified',
      registrationType: 'DISTRIBUTOR',
    },
    category: { name: 'Category' },
    productModel: { modelName: 'Model' },
    distributionNode: {
      id: 'node-1',
      relationshipStatus: 'ACTIVE',
      shop: {
        shopStatus: 'verified',
      },
    },
    batchLinks: [
      {
        allocatedQuantity: 5,
        batch: {
          distributionNodeId: 'node-1',
          sourceType: 'WHOLESALE_ORDER',
        },
      },
    ],
    media: [],
    createdAt: new Date('2026-05-19T00:00:00.000Z'),
    ...overrides,
  };
}
