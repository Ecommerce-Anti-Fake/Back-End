import { Injectable, NotFoundException } from '@nestjs/common';
import { OffersRepository } from '../../infrastructure/persistence/offers.repository';
import { toOfferVariantResponse } from './offers.mapper';

@Injectable()
export class ListOfferVariantsUseCase {
  constructor(private readonly offersRepository: OffersRepository) {}

  async execute(input: {
    offerId: string;
    sellerUserId: string;
    isActive?: boolean;
  }) {
    const variants = await this.offersRepository.findOwnedOfferVariants(input);
    if (!variants) {
      throw new NotFoundException('Offer not found');
    }
    return variants.map(toOfferVariantResponse);
  }
}
