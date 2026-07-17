import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OffersRepository } from '../../infrastructure/persistence/offers.repository';
import { MediaService } from '@media';

const IMAGE_DATA_URL = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

@Injectable()
export class UpdateOfferVariantUseCase {
  constructor(
    private readonly offersRepository: OffersRepository,
    private readonly mediaService: MediaService,
  ) {}

  async execute(input: {
    offerId: string;
    variantId: string;
    sellerUserId: string;
    priceOverride?: number | null;
    availableQuantity?: number;
    image?: string | null;
  }) {
    if (input.priceOverride != null && input.priceOverride < 0) {
      throw new BadRequestException('Price override must be at least 0');
    }
    if (
      input.availableQuantity != null &&
      (!Number.isInteger(input.availableQuantity) ||
        input.availableQuantity < 0)
    ) {
      throw new BadRequestException('Available quantity must be at least 0');
    }
    let mediaAssetId: string | null | undefined;
    if (input.image !== undefined) {
      if (!input.image) {
        mediaAssetId = null;
      } else {
        const dataUrl = IMAGE_DATA_URL.exec(input.image.trim());
        if (!dataUrl) throw new BadRequestException('Variant image Data URL is invalid');
        const buffer = Buffer.from(dataUrl[2], 'base64');
        if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) {
          throw new BadRequestException('Variant image must be non-empty and not exceed 5 MB');
        }
        const uploaded = await this.mediaService.uploadCloudinaryBuffer({
          buffer, folder: 'offers/variants', requesterUserId: input.sellerUserId,
          assetType: 'IMAGE', mimeType: dataUrl[1], sequence: 1,
        });
        const asset = await this.mediaService.createCloudinaryAsset({
          ownerUserId: input.sellerUserId, assetType: 'IMAGE', resourceType: 'PRODUCT_IMAGE',
          publicId: uploaded.publicId, secureUrl: uploaded.secureUrl,
          mimeType: dataUrl[1], folder: 'offers/variants',
        });
        mediaAssetId = asset.id;
      }
    }
    const variant = await this.offersRepository.updateOwnedOfferVariant({
      offerId: input.offerId,
      variantId: input.variantId,
      sellerUserId: input.sellerUserId,
      data: {
        ...(input.priceOverride !== undefined
          ? { price: input.priceOverride }
          : {}),
        ...(input.availableQuantity !== undefined
          ? { availableQuantity: input.availableQuantity }
          : {}),
        ...(mediaAssetId !== undefined ? { mediaAssetId } : {}),
      },
    });
    if (!variant) {
      throw new NotFoundException('Variant not found');
    }
    return { success: true as const, message: 'Cập nhật variant thành công.' };
  }
}
