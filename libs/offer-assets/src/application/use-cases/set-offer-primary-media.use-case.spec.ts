import { Test, TestingModule } from '@nestjs/testing';
import { OfferAssetsRepository } from '../../infrastructure/persistence/offer-assets.repository';
import { SetOfferPrimaryMediaUseCase } from './set-offer-primary-media.use-case';

describe('SetOfferPrimaryMediaUseCase in OfferAssetsModule', () => {
  let useCase: SetOfferPrimaryMediaUseCase;

  const repositoryMock = {
    findOwnedOfferMedia: jest.fn(),
    setOfferPrimaryMedia: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SetOfferPrimaryMediaUseCase,
        { provide: OfferAssetsRepository, useValue: repositoryMock },
      ],
    }).compile();

    useCase = module.get<SetOfferPrimaryMediaUseCase>(
      SetOfferPrimaryMediaUseCase,
    );
  });

  it('should set owned media as thumbnail', async () => {
    repositoryMock.findOwnedOfferMedia.mockResolvedValueOnce({ id: 'media-1' });
    repositoryMock.setOfferPrimaryMedia.mockResolvedValueOnce({
      id: 'media-1',
      offerId: 'offer-1',
      mediaAssetId: 'asset-1',
      mediaType: 'thumbnail',
      fileUrl:
        'https://res.cloudinary.com/demo/image/upload/v1/offers/offer-1/media/photo.jpg',
      phash: null,
      createdAt: new Date('2026-05-15T10:00:00.000Z'),
      mediaAsset: {
        assetType: 'IMAGE',
        mimeType: 'image/jpeg',
        publicId: 'offers/offer-1/media/photo',
        secureUrl:
          'https://res.cloudinary.com/demo/image/upload/v1/offers/offer-1/media/photo.jpg',
      },
    });

    const result = await useCase.execute({
      offerId: 'offer-1',
      mediaId: 'media-1',
      requesterUserId: 'seller-1',
    });

    expect(repositoryMock.setOfferPrimaryMedia).toHaveBeenCalledWith(
      'offer-1',
      'media-1',
    );
    expect(result).toMatchObject({ id: 'media-1', mediaType: 'thumbnail' });
  });
});
