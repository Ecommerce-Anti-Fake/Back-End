import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OffersRepository } from '../../infrastructure/persistence/offers.repository';
import { toOfferVariantResponse } from './offers.mapper';

@Injectable()
export class UpdateOfferVariantUseCase {
  constructor(private readonly offersRepository: OffersRepository) {}

  async execute(input: {
    offerId: string;
    variantId: string;
    sellerUserId: string;
    sku?: string | null;
    priceOverride?: number | null;
    availableQuantity?: number;
    mediaAssetId?: string | null;
    isActive?: boolean;
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
    const mediaAssetId = input.mediaAssetId?.trim() || null;
    if (
      mediaAssetId &&
      (
        await this.offersRepository.findOwnedMediaAssets(
          [mediaAssetId],
          input.sellerUserId,
        )
      ).length !== 1
    ) {
      throw new BadRequestException(
        'Variant media asset is invalid or does not belong to current user',
      );
    }
    const variant = await this.offersRepository.updateOwnedOfferVariant({
      offerId: input.offerId,
      variantId: input.variantId,
      sellerUserId: input.sellerUserId,
      data: {
        ...(input.sku !== undefined ? { sku: input.sku?.trim() || null } : {}),
        ...(input.priceOverride !== undefined
          ? { price: input.priceOverride }
          : {}),
        ...(input.availableQuantity !== undefined
          ? { availableQuantity: input.availableQuantity }
          : {}),
        ...(input.mediaAssetId !== undefined ? { mediaAssetId } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
    if (!variant) {
      throw new NotFoundException('Variant not found');
    }
    return toOfferVariantResponse(variant);
  }
}
