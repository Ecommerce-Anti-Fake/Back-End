import { Injectable, NotFoundException } from '@nestjs/common';
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

    await this.offerAssetsRepository.deleteOfferMedia(input.mediaId);
    return { deleted: true, id: input.mediaId };
  }
}
