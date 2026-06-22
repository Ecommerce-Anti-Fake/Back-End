import { Injectable, NotFoundException } from '@nestjs/common';
import { OfferAssetsRepository } from '../../infrastructure/persistence/offer-assets.repository';

@Injectable()
export class DeleteOfferDocumentUseCase {
  constructor(private readonly offerAssetsRepository: OfferAssetsRepository) {}

  async execute(input: {
    offerId: string;
    documentId: string;
    requesterUserId: string;
  }) {
    const document = await this.offerAssetsRepository.findOwnedOfferDocument(
      input.offerId,
      input.documentId,
      input.requesterUserId,
    );
    if (!document) {
      throw new NotFoundException('Offer document not found');
    }

    await this.offerAssetsRepository.deleteOfferDocument(input.documentId);
    return { deleted: true };
  }
}
