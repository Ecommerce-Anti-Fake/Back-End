import { Test, TestingModule } from '@nestjs/testing';
import { MediaService } from '@media';
import { AddOfferDocumentsBatchUseCase } from './add-offer-documents-batch.use-case';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';

describe('AddOfferDocumentsBatchUseCase', () => {
  let useCase: AddOfferDocumentsBatchUseCase;

  const repositoryMock = {
    findOwnedOffer: jest.fn(),
    createOfferDocument: jest.fn(),
  };

  const mediaServiceMock = {
    isOwnedCloudinaryUrl: jest.fn(),
    createCloudinaryAsset: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddOfferDocumentsBatchUseCase,
        { provide: ProductRepository, useValue: repositoryMock },
        { provide: MediaService, useValue: mediaServiceMock },
      ],
    }).compile();

    useCase = module.get<AddOfferDocumentsBatchUseCase>(AddOfferDocumentsBatchUseCase);
  });

  it('should persist uploaded documents for an active offer', async () => {
    repositoryMock.findOwnedOffer.mockResolvedValueOnce({
      id: 'offer-1',
      shop: {
        id: 'shop-1',
        shopStatus: 'active',
      },
    });
    mediaServiceMock.isOwnedCloudinaryUrl.mockReturnValue(true);
    mediaServiceMock.createCloudinaryAsset.mockResolvedValueOnce({
      id: 'media-1',
    });
    repositoryMock.createOfferDocument.mockResolvedValueOnce({
      id: 'offer-doc-1',
      offerId: 'offer-1',
      mediaAssetId: 'media-1',
      docType: 'INGREDIENT_CERTIFICATE',
      fileUrl: 'https://res.cloudinary.com/demo/raw/upload/v1/offers/offer-1/documents/file.pdf',
      issuerName: 'Bo Y Te',
      reviewStatus: 'pending',
      uploadedAt: new Date('2026-04-16T13:00:00.000Z'),
      mediaAsset: {
        mimeType: 'application/pdf',
        publicId: 'offers/offer-1/documents/file',
        secureUrl: 'https://res.cloudinary.com/demo/raw/upload/v1/offers/offer-1/documents/file.pdf',
      },
    });

    const result = await useCase.execute({
      offerId: 'offer-1',
      requesterUserId: 'user-1',
      items: [
        {
          docType: 'INGREDIENT_CERTIFICATE',
          mimeType: 'application/pdf',
          fileUrl: 'https://res.cloudinary.com/demo/raw/upload/v1/offers/offer-1/documents/file.pdf',
          publicId: 'offers/offer-1/documents/file',
          issuerName: 'Bo Y Te',
          documentNumber: 'GCN-001',
        },
      ],
    });

    expect(repositoryMock.createOfferDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        offerId: 'offer-1',
        mediaAssetId: 'media-1',
        docType: 'INGREDIENT_CERTIFICATE',
      }),
    );
    expect(result[0]).toMatchObject({
      id: 'offer-doc-1',
      offerId: 'offer-1',
      mediaAssetId: 'media-1',
      reviewStatus: 'pending',
    });
  });
});
