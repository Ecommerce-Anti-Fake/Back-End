import { Test, TestingModule } from '@nestjs/testing';
import { AllocateOfferBatchesUseCase } from './allocate-offer-batches.use-case';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';

describe('AllocateOfferBatchesUseCase', () => {
  let useCase: AllocateOfferBatchesUseCase;

  const productRepositoryMock = {
    findOwnedOffer: jest.fn(),
    findAllocatableBatches: jest.fn(),
    replaceOfferBatchLinks: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AllocateOfferBatchesUseCase,
        { provide: ProductRepository, useValue: productRepositoryMock },
      ],
    }).compile();

    useCase = module.get<AllocateOfferBatchesUseCase>(AllocateOfferBatchesUseCase);
  });

  it('should reject allocation when new total is lower than already sold quantity', async () => {
    productRepositoryMock.findOwnedOffer.mockResolvedValueOnce({
      id: 'offer-1',
      productModelId: 'model-1',
      availableQuantity: 3,
      shop: {
        id: 'shop-1',
        shopStatus: 'active',
      },
      batchLinks: [
        { allocatedQuantity: 5 },
      ],
    });
    productRepositoryMock.findAllocatableBatches.mockResolvedValueOnce([
      {
        id: 'batch-1',
        batchNumber: 'BATCH-1',
        quantity: 4,
        productModelId: 'model-1',
        offerLinks: [],
      },
    ]);

    await expect(
      useCase.execute({
        offerId: 'offer-1',
        requesterUserId: 'user-1',
        items: [
          {
            batchId: 'batch-1',
            allocatedQuantity: 1,
          },
        ],
      }),
    ).rejects.toThrow('Allocated quantity cannot be lower than the quantity already sold');
  });

  it('should replace allocations and return mapped links', async () => {
    productRepositoryMock.findOwnedOffer.mockResolvedValueOnce({
      id: 'offer-1',
      productModelId: 'model-1',
      availableQuantity: 5,
      shop: {
        id: 'shop-1',
        shopStatus: 'active',
      },
      batchLinks: [],
    });
    productRepositoryMock.findAllocatableBatches.mockResolvedValueOnce([
      {
        id: 'batch-1',
        batchNumber: 'BATCH-1',
        quantity: 10,
        productModelId: 'model-1',
        offerLinks: [],
      },
    ]);
    productRepositoryMock.replaceOfferBatchLinks.mockResolvedValueOnce([
      {
        id: 'link-1',
        offerId: 'offer-1',
        batchId: 'batch-1',
        allocatedQuantity: 5,
        createdAt: new Date('2026-04-16T15:30:00.000Z'),
        batch: {
          batchNumber: 'BATCH-1',
          productModelId: 'model-1',
          quantity: 10,
        },
      },
    ]);

    const result = await useCase.execute({
      offerId: 'offer-1',
      requesterUserId: 'user-1',
      items: [
        {
          batchId: 'batch-1',
          allocatedQuantity: 5,
        },
      ],
    });

    expect(productRepositoryMock.replaceOfferBatchLinks).toHaveBeenCalledWith({
      offerId: 'offer-1',
      soldQuantity: 0,
      items: [
        {
          batchId: 'batch-1',
          allocatedQuantity: 5,
        },
      ],
    });
    expect(result).toMatchObject([
      {
        id: 'link-1',
        offerId: 'offer-1',
        batchId: 'batch-1',
        allocatedQuantity: 5,
        batchNumber: 'BATCH-1',
      },
    ]);
  });
});
