import { Test, TestingModule } from '@nestjs/testing';
import { GetSupplyBatchDetailUseCase } from './get-supply-batch-detail.use-case';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';

describe('GetSupplyBatchDetailUseCase', () => {
  let useCase: GetSupplyBatchDetailUseCase;

  const repositoryMock = {
    findOwnedBatchDetail: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetSupplyBatchDetailUseCase,
        { provide: DistributionPricingRepository, useValue: repositoryMock },
      ],
    }).compile();

    useCase = module.get<GetSupplyBatchDetailUseCase>(GetSupplyBatchDetailUseCase);
  });

  it('should map batch detail allocations and consumptions', async () => {
    repositoryMock.findOwnedBatchDetail.mockResolvedValueOnce({
      id: 'batch-1',
      shopId: 'shop-1',
      productModelId: 'model-1',
      distributionNodeId: null,
      batchNumber: 'BATCH-1',
      quantity: 300,
      sourceName: 'Factory A',
      countryOfOrigin: 'VN',
      sourceType: 'MANUFACTURER',
      receivedAt: new Date('2026-04-17T09:00:00.000Z'),
      offerLinks: [
        {
          allocatedQuantity: 100,
          offer: {
            id: 'offer-1',
            title: 'Offer 1',
            availableQuantity: 100,
          },
        },
      ],
      orderItemAllocations: [
        {
          quantity: 25,
          orderItem: {
            id: 'order-item-1',
            orderId: 'order-1',
            offerId: 'offer-1',
            order: {
              orderStatus: 'pending',
              createdAt: new Date('2026-04-17T10:00:00.000Z'),
            },
          },
        },
      ],
      shipmentItems: [],
    });

    const result = await useCase.execute({
      requesterUserId: 'user-1',
      batchId: 'batch-1',
    });

    expect(result).toMatchObject({
      id: 'batch-1',
      totalAllocatedQuantity: 100,
      totalConsumedQuantity: 25,
      availableForAllocation: 200,
      allocations: [
        {
          offerId: 'offer-1',
          consumedQuantity: 25,
        },
      ],
      consumptions: [
        {
          orderId: 'order-1',
          quantity: 25,
        },
      ],
    });
  });
});
