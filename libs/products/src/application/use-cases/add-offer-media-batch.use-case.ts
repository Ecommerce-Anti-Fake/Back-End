import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MediaService } from '@media';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';
import { toOfferMediaResponse } from './products.mapper';

@Injectable()
export class AddOfferMediaBatchUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly mediaService: MediaService,
  ) {}

  async execute(input: {
    offerId: string;
    requesterUserId: string;
    items: Array<{
      assetType: 'IMAGE' | 'VIDEO';
      mimeType: string;
      fileUrl: string;
      publicId: string;
      mediaType?: string | null;
      phash?: string | null;
    }>;
  }) {
    const offer = await this.productRepository.findOwnedOffer(input.offerId, input.requesterUserId);
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (offer.shop.shopStatus !== 'active') {
      throw new BadRequestException('Only active shops can upload offer media');
    }

    if (input.items.length === 0) {
      throw new BadRequestException('At least one offer media item is required');
    }

    const results: Array<ReturnType<typeof toOfferMediaResponse>> = [];

    for (const item of input.items) {
      if (!this.mediaService.isOwnedCloudinaryUrl(item.fileUrl)) {
        throw new BadRequestException('Offer media URL must belong to the configured Cloudinary cloud');
      }

      const publicId = item.publicId.trim();
      if (!publicId.startsWith(`offers/${offer.id}/media/`)) {
        throw new BadRequestException('Offer media public ID does not belong to the offer media folder');
      }

      const mimeType = item.mimeType.trim().toLowerCase();
      if (!mimeType) {
        throw new BadRequestException('MIME type is required');
      }

      const mediaAsset = await this.mediaService.createCloudinaryAsset({
        ownerUserId: input.requesterUserId,
        assetType: item.assetType,
        resourceType: 'PRODUCT_IMAGE',
        publicId,
        secureUrl: item.fileUrl,
        mimeType,
        folder: `offers/${offer.id}/media`,
      });

      const media = await this.productRepository.createOfferMedia({
        offerId: offer.id,
        mediaAssetId: mediaAsset.id,
        mediaType: item.mediaType?.trim() || 'gallery',
        fileUrl: item.fileUrl,
        phash: item.phash?.trim() || null,
      });

      results.push(toOfferMediaResponse(media));
    }

    return results;
  }
}
