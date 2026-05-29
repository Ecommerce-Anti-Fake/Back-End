import { BadRequestException } from '@nestjs/common';
import { CreateSupplyBatchUseCase } from './create-supply-batch.use-case';

describe('CreateSupplyBatchUseCase', () => {
  const repository = {
    findOwnedActiveShop: jest.fn(),
    findProductModelById: jest.fn(),
    findOfferIdentityById: jest.fn(),
    findNodeById: jest.fn(),
    createBatch: jest.fn(),
  };

  let useCase: CreateSupplyBatchUseCase;

  beforeEach(() => {
    jest.resetAllMocks();
    useCase = new CreateSupplyBatchUseCase(repository as never);
  });

  it('should create a batch from explicit product identity snapshot', async () => {
    repository.findOwnedActiveShop.mockResolvedValueOnce({
      id: 'shop-1',
      registrationType: 'MANUFACTURER',
    });
    repository.createBatch.mockResolvedValueOnce({
      id: 'batch-1',
      shopId: 'shop-1',
      brandId: 'brand-1',
      categoryId: 'category-1',
      modelName: 'Model 1',
      gtin: 'GTIN-1',
      verificationPolicy: 'manual_review',
      distributionNodeId: null,
      batchNumber: 'BATCH-1',
      quantity: 10,
      sourceName: 'Factory',
      countryOfOrigin: 'VN',
      sourceType: 'PRODUCTION',
      sourceOrderId: null,
      sourceOrderItemId: null,
      receivedAt: new Date('2026-05-27T00:00:00.000Z'),
    });

    await useCase.execute({
      requesterUserId: 'user-1',
      shopId: 'shop-1',
      brandId: 'brand-1',
      categoryId: 'category-1',
      modelName: 'Model 1',
      gtin: 'GTIN-1',
      verificationPolicy: 'manual_review',
      batchNumber: 'BATCH-1',
      quantity: 10,
      sourceName: 'Factory',
      countryOfOrigin: 'VN',
      sourceType: 'PRODUCTION',
      receivedAt: '2026-05-27T00:00:00.000Z',
    });

    expect(repository.createBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        brandId: 'brand-1',
        categoryId: 'category-1',
        modelName: 'Model 1',
        gtin: 'GTIN-1',
        verificationPolicy: 'manual_review',
      }),
    );
  });

  it('should reject production batches from non-manufacturer shops', async () => {
    repository.findOwnedActiveShop.mockResolvedValueOnce({
      id: 'shop-1',
      registrationType: 'DISTRIBUTOR',
    });
    await expect(
      useCase.execute({
        requesterUserId: 'user-1',
        shopId: 'shop-1',
        brandId: 'brand-1',
        categoryId: 'category-1',
        modelName: 'Model 1',
        distributionNodeId: 'node-1',
        batchNumber: 'BATCH-1',
        quantity: 10,
        sourceName: 'Factory',
        countryOfOrigin: 'VN',
        sourceType: 'PRODUCTION',
        receivedAt: '2026-05-27T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should snapshot product identity from an offer without requiring a product model lookup', async () => {
    repository.findOwnedActiveShop.mockResolvedValueOnce({
      id: 'shop-1',
      registrationType: 'MANUFACTURER',
    });
    repository.findOfferIdentityById.mockResolvedValueOnce({
      id: 'offer-1',
      shopId: 'shop-1',
      brandId: 'brand-from-offer',
      categoryId: 'category-from-offer',
      modelName: 'Offer Snapshot Product',
      gtin: 'GTIN-OFFER',
      verificationPolicy: 'strict',
    });
    repository.createBatch.mockResolvedValueOnce({
      id: 'batch-1',
      shopId: 'shop-1',
      brandId: 'brand-from-offer',
      categoryId: 'category-from-offer',
      modelName: 'Offer Snapshot Product',
      gtin: 'GTIN-OFFER',
      verificationPolicy: 'strict',
      distributionNodeId: null,
      batchNumber: 'BATCH-OFFER',
      quantity: 10,
      sourceName: 'Factory',
      countryOfOrigin: 'VN',
      sourceType: 'PRODUCTION',
      sourceOrderId: null,
      sourceOrderItemId: null,
      receivedAt: new Date('2026-05-27T00:00:00.000Z'),
    });

    await useCase.execute({
      requesterUserId: 'user-1',
      shopId: 'shop-1',
      offerId: 'offer-1',
      batchNumber: 'BATCH-OFFER',
      quantity: 10,
      sourceName: 'Factory',
      countryOfOrigin: 'VN',
      sourceType: 'PRODUCTION',
      receivedAt: '2026-05-27T00:00:00.000Z',
    });

    expect(repository.createBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        brandId: 'brand-from-offer',
        categoryId: 'category-from-offer',
        modelName: 'Offer Snapshot Product',
        gtin: 'GTIN-OFFER',
        verificationPolicy: 'strict',
      }),
    );
  });

  it('should create a batch from explicit product identity snapshot without a product model id', async () => {
    repository.findOwnedActiveShop.mockResolvedValueOnce({
      id: 'shop-1',
      registrationType: 'MANUFACTURER',
    });
    repository.createBatch.mockResolvedValueOnce({
      id: 'batch-1',
      shopId: 'shop-1',
      brandId: 'brand-snapshot',
      categoryId: 'category-snapshot',
      modelName: 'Snapshot Product',
      gtin: null,
      verificationPolicy: 'manual_review',
      distributionNodeId: null,
      batchNumber: 'BATCH-SNAPSHOT',
      quantity: 10,
      sourceName: 'Factory',
      countryOfOrigin: 'VN',
      sourceType: 'PRODUCTION',
      sourceOrderId: null,
      sourceOrderItemId: null,
      receivedAt: new Date('2026-05-27T00:00:00.000Z'),
    });

    await useCase.execute({
      requesterUserId: 'user-1',
      shopId: 'shop-1',
      brandId: 'brand-snapshot',
      categoryId: 'category-snapshot',
      modelName: 'Snapshot Product',
      gtin: null,
      verificationPolicy: 'manual_review',
      batchNumber: 'BATCH-SNAPSHOT',
      quantity: 10,
      sourceName: 'Factory',
      countryOfOrigin: 'VN',
      sourceType: 'PRODUCTION',
      receivedAt: '2026-05-27T00:00:00.000Z',
    });

    expect(repository.findOfferIdentityById).not.toHaveBeenCalled();
    expect(repository.createBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        brandId: 'brand-snapshot',
        categoryId: 'category-snapshot',
        modelName: 'Snapshot Product',
        gtin: null,
        verificationPolicy: 'manual_review',
      }),
    );
  });
});
