import { Injectable, NotFoundException } from '@nestjs/common';
import { OffersRepository } from '../../infrastructure/persistence/offers.repository';
import { toOfferResponse } from './offers.mapper';

@Injectable()
export class GetOfferByIdUseCase {
  constructor(private readonly productRepository: OffersRepository) {}

  async execute(id: string) {
    const offer = await this.productRepository.findOfferById(id);
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    return toOfferResponse(offer);
  }
}
