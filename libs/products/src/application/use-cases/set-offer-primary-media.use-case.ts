import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';
import { toOfferMediaResponse } from './products.mapper';

@Injectable()
export class SetOfferPrimaryMediaUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(input: {
    offerId: string;
    mediaId: string;
    requesterUserId: string;
  }) {
    const media = await this.productRepository.findOwnedOfferMedia(
      input.offerId,
      input.mediaId,
      input.requesterUserId,
    );
    if (!media) {
      throw new NotFoundException('Offer media not found');
    }

    const updatedMedia = await this.productRepository.setOfferPrimaryMedia(input.offerId, input.mediaId);
    return toOfferMediaResponse(updatedMedia);
  }
}
