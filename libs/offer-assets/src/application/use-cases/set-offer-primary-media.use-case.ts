import { Injectable, NotFoundException } from '@nestjs/common';
import { OfferAssetsRepository } from '../../infrastructure/persistence/offer-assets.repository';
import { toOfferMediaResponse } from '../offer-assets.mapper';

@Injectable()
export class SetOfferPrimaryMediaUseCase {
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

    const updatedMedia = await this.offerAssetsRepository.setOfferPrimaryMedia(
      input.offerId,
      input.mediaId,
    );
    return toOfferMediaResponse(updatedMedia);
  }
}
