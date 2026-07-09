import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OffersRepository } from '../../infrastructure/persistence/offers.repository';
import { toOfferVariantResponse } from './offers.mapper';

@Injectable()
export class CreateOfferVariantUseCase {
  constructor(private readonly offersRepository: OffersRepository) {}

  async execute(input: {
    offerId: string;
    sellerUserId: string;
    sku?: string | null;
    priceOverride?: number | null;
    availableQuantity: number;
    mediaAssetId?: string | null;
    isActive?: boolean;
    optionValueIds: string[];
  }) {
    if (
      !Number.isInteger(input.availableQuantity) ||
      input.availableQuantity < 0
    ) {
      throw new BadRequestException('Available quantity must be at least 0');
    }
    if (input.priceOverride != null && input.priceOverride <= 0) {
      throw new BadRequestException('Price override must be greater than 0');
    }

    const optionValueIds = [
      ...new Set(input.optionValueIds.map((id) => id.trim())),
    ]
      .filter(Boolean)
      .sort();
    if (
      optionValueIds.length !== input.optionValueIds.length ||
      optionValueIds.length === 0
    ) {
      throw new BadRequestException(
        'Option value IDs must be unique and non-empty',
      );
    }

    const offer = await this.offersRepository.findOwnedOfferOptionValues(
      input.offerId,
      input.sellerUserId,
      optionValueIds,
    );
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    const selectedValues = offer.optionGroups.flatMap((group) =>
      group.values.map((value) => ({ ...value, optionGroupId: group.id })),
    );
    if (selectedValues.length !== optionValueIds.length) {
      throw new BadRequestException(
        'All option values must belong to the offer',
      );
    }
    if (
      new Set(selectedValues.map((value) => value.optionGroupId)).size !==
      selectedValues.length
    ) {
      throw new BadRequestException(
        'A variant cannot contain multiple values from the same option group',
      );
    }

    if (
      await this.offersRepository.findOfferVariantByOptionValueIds(
        input.offerId,
        optionValueIds,
      )
    ) {
      throw new ConflictException('Variant option combination already exists');
    }

    const mediaAssetId = input.mediaAssetId?.trim() || null;
    if (
      mediaAssetId &&
      !(await this.offersRepository.findMediaAssetById(mediaAssetId))
    ) {
      throw new BadRequestException('Variant media asset not found');
    }

    const variant = await this.offersRepository.createOfferVariant({
      offerId: input.offerId,
      sku: input.sku?.trim() || null,
      price: input.priceOverride ?? null,
      availableQuantity: input.availableQuantity,
      mediaAssetId,
      isActive: input.isActive ?? true,
      optionValueIds,
    });
    return toOfferVariantResponse(variant);
  }
}
