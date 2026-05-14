import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';

@Injectable()
export class DeleteOfferMediaUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(input: { offerId: string; mediaId: string; requesterUserId: string }) {
    const media = await this.productRepository.findOwnedOfferMedia(
      input.offerId,
      input.mediaId,
      input.requesterUserId,
    );
    if (!media) {
      throw new NotFoundException('Offer media not found');
    }

    await this.productRepository.deleteOfferMedia(input.mediaId);
    return { deleted: true, id: input.mediaId };
  }
}
