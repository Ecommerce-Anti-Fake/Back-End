import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MediaService } from '@media';
import { OfferAssetsRepository } from '../../infrastructure/persistence/offer-assets.repository';
import { toOfferMediaResponse } from '../offer-assets.mapper';

const ALLOWED_OFFER_MEDIA_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);
const MAX_OFFER_MEDIA_BYTES = 5 * 1024 * 1024;

@Injectable()
export class AddOfferMediaBatchUseCase {
  constructor(
    private readonly offerAssetsRepository: OfferAssetsRepository,
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
      bytes?: number | null;
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
      throw new BadRequestException('Only active shops can upload offer media');
    }

    if (input.items.length === 0) {
      throw new BadRequestException(
        'At least one offer media item is required',
      );
    }

    const results: Array<ReturnType<typeof toOfferMediaResponse>> = [];

    for (const item of input.items) {
      if (!this.mediaService.isOwnedCloudinaryUrl(item.fileUrl)) {
        throw new BadRequestException(
          'Offer media URL must belong to the configured Cloudinary cloud',
        );
      }

      const publicId = item.publicId.trim();
      if (!publicId.startsWith(`offers/${offer.id}/media/`)) {
        throw new BadRequestException(
          'Offer media public ID does not belong to the offer media folder',
        );
      }

      const mimeType = item.mimeType.trim().toLowerCase();
      if (!ALLOWED_OFFER_MEDIA_MIME_TYPES.has(mimeType)) {
        throw new BadRequestException('Offer media must be JPG, PNG or WEBP');
      }

      if (
        item.bytes !== undefined &&
        item.bytes !== null &&
        item.bytes > MAX_OFFER_MEDIA_BYTES
      ) {
        throw new BadRequestException(
          'Offer media file size must be at most 5MB',
        );
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

      const media = await this.offerAssetsRepository.createOfferMedia({
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
