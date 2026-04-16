import { Test, TestingModule } from '@nestjs/testing';
import { MediaService } from '@media';
import { GetOfferMediaUploadSignaturesUseCase } from './get-offer-media-upload-signatures.use-case';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';

describe('GetOfferMediaUploadSignaturesUseCase', () => {
  let useCase: GetOfferMediaUploadSignaturesUseCase;

  const repositoryMock = {
    findOwnedOffer: jest.fn(),
  };

  const mediaServiceMock = {
    createCloudinaryUploadSignature: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetOfferMediaUploadSignaturesUseCase,
        { provide: ProductRepository, useValue: repositoryMock },
        { provide: MediaService, useValue: mediaServiceMock },
      ],
    }).compile();

    useCase = module.get<GetOfferMediaUploadSignaturesUseCase>(GetOfferMediaUploadSignaturesUseCase);
  });

  it('should return signed upload params for active offer owner', async () => {
    repositoryMock.findOwnedOffer.mockResolvedValueOnce({
      id: 'offer-1',
      shop: {
        id: 'shop-1',
        shopStatus: 'active',
      },
    });
    mediaServiceMock.createCloudinaryUploadSignature.mockReturnValue({
      cloudName: 'demo',
      apiKey: '123',
      timestamp: 1,
      folder: 'offers/offer-1/media',
      publicId: 'offers/offer-1/media/file',
      uploadResourceType: 'image',
      signature: 'sig',
    });

    const result = await useCase.execute({
      offerId: 'offer-1',
      requesterUserId: 'user-1',
      items: [{ assetType: 'IMAGE' }],
    });

    expect(result).toHaveLength(1);
    expect(mediaServiceMock.createCloudinaryUploadSignature).toHaveBeenCalled();
  });
});
