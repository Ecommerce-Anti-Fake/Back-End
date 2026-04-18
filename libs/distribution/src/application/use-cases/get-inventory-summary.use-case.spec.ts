import { Test, TestingModule } from '@nestjs/testing';
import { GetInventorySummaryUseCase } from './get-inventory-summary.use-case';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';

describe('GetInventorySummaryUseCase', () => {
  let useCase: GetInventorySummaryUseCase;

  const repositoryMock = {
    getInventorySummary: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetInventorySummaryUseCase,
        { provide: DistributionPricingRepository, useValue: repositoryMock },
      ],
    }).compile();

    useCase = module.get<GetInventorySummaryUseCase>(GetInventorySummaryUseCase);
  });

  it('should map inventory summary totals', async () => {
    repositoryMock.getInventorySummary.mockResolvedValueOnce({
      shopId: 'shop-1',
      batches: [
        {
          id: 'batch-1',
          batchNumber: 'BATCH-1',
          productModelId: 'model-1',
          quantity: 300,
          offerLinks: [{ allocatedQuantity: 100 }],
          orderItemAllocations: [{ quantity: 25, orderItem: { offerId: 'offer-1' } }],
        },
      ],
      offers: [
        {
          id: 'offer-1',
          title: 'Offer 1',
          availableQuantity: 100,
          batchLinks: [{ allocatedQuantity: 100 }],
        },
      ],
    });

    const result = await useCase.execute({
      requesterUserId: 'user-1',
      shopId: 'shop-1',
    });

    expect(result).toMatchObject({
      shopId: 'shop-1',
      totalQuantityOnHand: 300,
      totalAllocatedQuantity: 100,
      totalConsumedQuantity: 25,
      totalUnallocatedQuantity: 200,
    });
  });
});
