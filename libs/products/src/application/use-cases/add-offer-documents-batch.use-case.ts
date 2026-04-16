import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MediaService } from '@media';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';
import { toOfferDocumentResponse } from './products.mapper';

@Injectable()
export class AddOfferDocumentsBatchUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly mediaService: MediaService,
  ) {}

  async execute(input: {
    offerId: string;
    requesterUserId: string;
    items: Array<{
      docType: string;
      mimeType: string;
      fileUrl: string;
      publicId: string;
      issuerName?: string | null;
      documentNumber?: string | null;
    }>;
  }) {
    const offer = await this.productRepository.findOwnedOffer(input.offerId, input.requesterUserId);
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (offer.shop.shopStatus !== 'active') {
      throw new BadRequestException('Only active shops can upload offer documents');
    }

    if (input.items.length === 0) {
      throw new BadRequestException('At least one offer document is required');
    }

    const results: Array<ReturnType<typeof toOfferDocumentResponse>> = [];

    for (const item of input.items) {
      if (!this.mediaService.isOwnedCloudinaryUrl(item.fileUrl)) {
        throw new BadRequestException('Offer document URL must belong to the configured Cloudinary cloud');
      }

      const publicId = item.publicId.trim();
      if (!publicId.startsWith(`offers/${offer.id}/documents/`)) {
        throw new BadRequestException('Offer document public ID does not belong to the offer documents folder');
      }

      const mediaAsset = await this.mediaService.createCloudinaryAsset({
        ownerUserId: input.requesterUserId,
        assetType: 'RAW',
        resourceType: 'OFFER_DOCUMENT',
        publicId,
        secureUrl: item.fileUrl,
        mimeType: item.mimeType.trim().toLowerCase(),
        folder: `offers/${offer.id}/documents`,
      });

      const document = await this.productRepository.createOfferDocument({
        offerId: offer.id,
        mediaAssetId: mediaAsset.id,
        docType: item.docType.trim(),
        fileUrl: item.fileUrl,
        issuerName: item.issuerName?.trim() || null,
        documentNumber: item.documentNumber?.trim() || null,
      });

      results.push(toOfferDocumentResponse(document));
    }

    return results;
  }
}
