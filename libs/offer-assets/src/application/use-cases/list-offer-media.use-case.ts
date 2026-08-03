import { Injectable, NotFoundException } from '@nestjs/common';
import { OfferAssetsRepository } from '../../infrastructure/persistence/offer-assets.repository';
import { toOfferMediaResponse } from '../offer-assets.mapper';

@Injectable()
export class ListOfferMediaUseCase {
  constructor(private readonly offerAssetsRepository: OfferAssetsRepository) {}

  async execute(input: { offerId: string; requesterUserId: string }) {
    const offer = await this.offerAssetsRepository.findOwnedOffer(
      input.offerId,
      input.requesterUserId,
    );
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    const media = await this.offerAssetsRepository.findOfferMedia(input.offerId);
    return media.map(toOfferMediaResponse);
  }
}
