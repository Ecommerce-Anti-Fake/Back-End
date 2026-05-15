import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';

@Injectable()
export class DeleteOfferDocumentUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(input: {
    offerId: string;
    documentId: string;
    requesterUserId: string;
  }) {
    const document = await this.productRepository.findOwnedOfferDocument(
      input.offerId,
      input.documentId,
      input.requesterUserId,
    );
    if (!document) {
      throw new NotFoundException('Offer document not found');
    }

    await this.productRepository.deleteOfferDocument(input.documentId);
    return { deleted: true };
  }
}
