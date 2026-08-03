import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OfferAssetsRepository } from '../../infrastructure/persistence/offer-assets.repository';

@Injectable()
export class DeleteOfferMediaUseCase {
  constructor(private readonly offerAssetsRepository: OfferAssetsRepository) {}

  async execute(input: {
    offerId: string;
    mediaId: string;
    requesterUserId: string;
  }) {
    const media = await this.offerAssetsRepository.findOwnedOfferMedia(
      input.offerId,
      input.mediaId,
      input.requesterUserId,
    );
    if (!media) {
      throw new NotFoundException('Offer media not found');
    }

    const mediaItems = await this.offerAssetsRepository.findOfferMedia(input.offerId);
    if (mediaItems.length <= 1) {
      throw new BadRequestException('Offer must have at least one image');
    }

    await this.offerAssetsRepository.deleteOfferMedia(input.mediaId);

    if (media.mediaType === 'thumbnail') {
      const nextPrimary = mediaItems.find((item) => item.id !== input.mediaId);
      if (nextPrimary) {
        await this.offerAssetsRepository.setOfferPrimaryMedia(
          input.offerId,
          nextPrimary.id,
        );
      }
    }

    return { deleted: true, id: input.mediaId };
  }
}
