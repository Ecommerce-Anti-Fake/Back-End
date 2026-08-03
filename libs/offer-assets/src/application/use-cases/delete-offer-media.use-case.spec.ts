import { BadRequestException } from '@nestjs/common';
import { DeleteOfferMediaUseCase } from './delete-offer-media.use-case';

describe('DeleteOfferMediaUseCase', () => {
  it('promotes the next image when the thumbnail is deleted', async () => {
    const repository = {
      findOwnedOfferMedia: jest.fn().mockResolvedValue({
        id: 'media-1',
        mediaType: 'thumbnail',
      }),
      findOfferMedia: jest.fn().mockResolvedValue([
        { id: 'media-1', mediaType: 'thumbnail' },
        { id: 'media-2', mediaType: 'gallery' },
      ]),
      deleteOfferMedia: jest.fn().mockResolvedValue(undefined),
      setOfferPrimaryMedia: jest.fn().mockResolvedValue(undefined),
    };

    const result = await new DeleteOfferMediaUseCase(repository as never).execute({
      offerId: 'offer-1',
      mediaId: 'media-1',
      requesterUserId: 'seller-1',
    });

    expect(result).toEqual({ deleted: true, id: 'media-1' });
    expect(repository.setOfferPrimaryMedia).toHaveBeenCalledWith(
      'offer-1',
      'media-2',
    );
  });

  it('does not allow deleting the only image', async () => {
    const repository = {
      findOwnedOfferMedia: jest.fn().mockResolvedValue({
        id: 'media-1',
        mediaType: 'thumbnail',
      }),
      findOfferMedia: jest.fn().mockResolvedValue([
        { id: 'media-1', mediaType: 'thumbnail' },
      ]),
      deleteOfferMedia: jest.fn(),
      setOfferPrimaryMedia: jest.fn(),
    };

    await expect(
      new DeleteOfferMediaUseCase(repository as never).execute({
        offerId: 'offer-1',
        mediaId: 'media-1',
        requesterUserId: 'seller-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.deleteOfferMedia).not.toHaveBeenCalled();
  });
});
