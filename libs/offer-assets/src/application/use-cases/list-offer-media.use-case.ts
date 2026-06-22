import { Injectable, NotFoundException } from '@nestjs/common';
import { OfferAssetsRepository } from '../../infrastructure/persistence/offer-assets.repository';
import { toOfferMediaResponse } from '../offer-assets.mapper';

@Injectable()
export class ListOfferMediaUseCase {
  constructor(private readonly offerAssetsRepository: OfferAssetsRepository) {}

  async execute(offerId: string) {
    const offer = await this.offerAssetsRepository.findOfferById(offerId);
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    const media = await this.offerAssetsRepository.findOfferMedia(offerId);
    return media.map(toOfferMediaResponse);
  }
}
