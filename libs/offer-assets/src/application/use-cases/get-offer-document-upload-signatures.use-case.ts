import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MediaService } from '@media';
import { OfferAssetsRepository } from '../../infrastructure/persistence/offer-assets.repository';

@Injectable()
export class GetOfferDocumentUploadSignaturesUseCase {
  constructor(
    private readonly offerAssetsRepository: OfferAssetsRepository,
    private readonly mediaService: MediaService,
  ) {}

  async execute(input: {
    offerId: string;
    requesterUserId: string;
    items: Array<{
      docType: string;
    }>;
  }) {
    const offer = await this.offerAssetsRepository.findOwnedOffer(
      input.offerId,
      input.requesterUserId,
    );
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (offer.shop.shopStatus !== 'verified') {
      throw new BadRequestException(
        'Only active shops can upload offer documents',
      );
    }

    if (input.items.length === 0) {
      throw new BadRequestException('At least one offer document is required');
    }

    return input.items.map((_, index) =>
      this.mediaService.createCloudinaryUploadSignature({
        folder: `offers/${offer.id}/documents`,
        requesterUserId: input.requesterUserId,
        assetType: 'RAW',
        sequence: index + 1,
      }),
    );
  }
}
