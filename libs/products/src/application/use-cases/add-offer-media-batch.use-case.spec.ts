import { Test, TestingModule } from '@nestjs/testing';
import { MediaService } from '@media';
import { AddOfferMediaBatchUseCase } from './add-offer-media-batch.use-case';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';

describe('AddOfferMediaBatchUseCase', () => {
  let useCase: AddOfferMediaBatchUseCase;

  const repositoryMock = {
    findOwnedOffer: jest.fn(),
    createOfferMedia: jest.fn(),
  };

  const mediaServiceMock = {
    isOwnedCloudinaryUrl: jest.fn(),
    createCloudinaryAsset: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddOfferMediaBatchUseCase,
        { provide: ProductRepository, useValue: repositoryMock },
        { provide: MediaService, useValue: mediaServiceMock },
      ],
    }).compile();

    useCase = module.get<AddOfferMediaBatchUseCase>(AddOfferMediaBatchUseCase);
  });

  it('should persist uploaded media for an active offer', async () => {
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
    repositoryMock.createOfferMedia.mockResolvedValueOnce({
      id: 'offer-media-1',
      offerId: 'offer-1',
      mediaAssetId: 'media-1',
      mediaType: 'gallery',
      fileUrl: 'https://res.cloudinary.com/demo/image/upload/v1/offers/offer-1/media/photo.jpg',
      phash: null,
      createdAt: new Date('2026-04-16T13:00:00.000Z'),
      mediaAsset: {
        assetType: 'IMAGE',
        mimeType: 'image/jpeg',
        publicId: 'offers/offer-1/media/photo',
        secureUrl: 'https://res.cloudinary.com/demo/image/upload/v1/offers/offer-1/media/photo.jpg',
      },
    });

    const result = await useCase.execute({
      offerId: 'offer-1',
      requesterUserId: 'user-1',
      items: [
        {
          assetType: 'IMAGE',
          mimeType: 'image/jpeg',
          fileUrl: 'https://res.cloudinary.com/demo/image/upload/v1/offers/offer-1/media/photo.jpg',
          publicId: 'offers/offer-1/media/photo',
        },
      ],
    });

    expect(repositoryMock.createOfferMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        offerId: 'offer-1',
        mediaAssetId: 'media-1',
      }),
    );
    expect(result[0]).toMatchObject({
      id: 'offer-media-1',
      offerId: 'offer-1',
      mediaAssetId: 'media-1',
    });
  });
});
