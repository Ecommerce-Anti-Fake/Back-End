import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';
import { toOfferMediaResponse } from './products.mapper';

@Injectable()
export class ListOfferMediaUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(offerId: string) {
    const offer = await this.productRepository.findOfferById(offerId);
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    const media = await this.productRepository.findOfferMedia(offerId);
    return media.map(toOfferMediaResponse);
  }
}
