import { Test, TestingModule } from '@nestjs/testing';
import { MediaService } from '@media';
import { GetBatchDocumentUploadSignaturesUseCase } from './get-batch-document-upload-signatures.use-case';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';

describe('GetBatchDocumentUploadSignaturesUseCase', () => {
  let useCase: GetBatchDocumentUploadSignaturesUseCase;

  const repositoryMock = {
    findOwnedBatch: jest.fn(),
  };

  const mediaServiceMock = {
    createCloudinaryUploadSignature: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetBatchDocumentUploadSignaturesUseCase,
        { provide: DistributionPricingRepository, useValue: repositoryMock },
        { provide: MediaService, useValue: mediaServiceMock },
      ],
    }).compile();

    useCase = module.get<GetBatchDocumentUploadSignaturesUseCase>(GetBatchDocumentUploadSignaturesUseCase);
  });

  it('should return signatures for an active batch owner', async () => {
    repositoryMock.findOwnedBatch.mockResolvedValueOnce({
      id: 'batch-1',
      shop: {
        id: 'shop-1',
        shopStatus: 'active',
      },
    });
    mediaServiceMock.createCloudinaryUploadSignature.mockReturnValue({
      cloudName: 'demo',
      apiKey: '123',
      timestamp: 1,
      folder: 'batches/batch-1/documents',
      publicId: 'batches/batch-1/documents/file',
      uploadResourceType: 'raw',
      signature: 'sig',
    });

    const result = await useCase.execute({
      batchId: 'batch-1',
      requesterUserId: 'user-1',
      items: [{ docType: 'INVOICE' }],
    });

    expect(result).toHaveLength(1);
    expect(mediaServiceMock.createCloudinaryUploadSignature).toHaveBeenCalled();
  });
});
