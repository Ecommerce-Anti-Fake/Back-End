import { Test, TestingModule } from '@nestjs/testing';
import { MediaService } from '@media';
import { AddBatchDocumentsBatchUseCase } from './add-batch-documents-batch.use-case';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';

describe('AddBatchDocumentsBatchUseCase', () => {
  let useCase: AddBatchDocumentsBatchUseCase;

  const repositoryMock = {
    findOwnedBatch: jest.fn(),
    createBatchDocument: jest.fn(),
  };

  const mediaServiceMock = {
    isOwnedCloudinaryUrl: jest.fn(),
    createCloudinaryAsset: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddBatchDocumentsBatchUseCase,
        { provide: DistributionPricingRepository, useValue: repositoryMock },
        { provide: MediaService, useValue: mediaServiceMock },
      ],
    }).compile();

    useCase = module.get<AddBatchDocumentsBatchUseCase>(AddBatchDocumentsBatchUseCase);
  });

  it('should persist uploaded batch documents for active shops', async () => {
    repositoryMock.findOwnedBatch.mockResolvedValueOnce({
      id: 'batch-1',
      shop: {
        id: 'shop-1',
        shopStatus: 'active',
      },
    });
    mediaServiceMock.isOwnedCloudinaryUrl.mockReturnValue(true);
    mediaServiceMock.createCloudinaryAsset.mockResolvedValueOnce({
      id: 'media-1',
    });
    repositoryMock.createBatchDocument.mockResolvedValueOnce({
      id: 'batch-doc-1',
      batchId: 'batch-1',
      mediaAssetId: 'media-1',
      docType: 'INVOICE',
      fileUrl: 'https://res.cloudinary.com/demo/raw/upload/v1/batches/batch-1/documents/invoice.pdf',
      issuerName: 'Cong ty ABC',
      reviewStatus: 'pending',
      uploadedAt: new Date('2026-04-16T13:40:00.000Z'),
      mediaAsset: {
        mimeType: 'application/pdf',
        publicId: 'batches/batch-1/documents/invoice',
        secureUrl: 'https://res.cloudinary.com/demo/raw/upload/v1/batches/batch-1/documents/invoice.pdf',
      },
    });

    const result = await useCase.execute({
      batchId: 'batch-1',
      requesterUserId: 'user-1',
      items: [
        {
          docType: 'INVOICE',
          mimeType: 'application/pdf',
          fileUrl: 'https://res.cloudinary.com/demo/raw/upload/v1/batches/batch-1/documents/invoice.pdf',
          publicId: 'batches/batch-1/documents/invoice',
          issuerName: 'Cong ty ABC',
          documentNumber: 'INV-001',
        },
      ],
    });

    expect(repositoryMock.createBatchDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        batchId: 'batch-1',
        mediaAssetId: 'media-1',
        docType: 'INVOICE',
      }),
    );
    expect(result[0]).toMatchObject({
      id: 'batch-doc-1',
      batchId: 'batch-1',
      mediaAssetId: 'media-1',
      reviewStatus: 'pending',
    });
  });
});
