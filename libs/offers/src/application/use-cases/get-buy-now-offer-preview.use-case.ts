import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OffersRepository } from '../../infrastructure/persistence/offers.repository';

type BuyNowOfferPreviewInput = {
  offerId: string;
  variantId?: string | null;
  quantity: number;
};

@Injectable()
export class GetBuyNowOfferPreviewUseCase {
  constructor(private readonly offersRepository: OffersRepository) {}

  async execute(input: BuyNowOfferPreviewInput) {
    const quantity = input.quantity;
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new BadRequestException('Quantity must be at least 1.');
    }

    const variantId = input.variantId ?? null;
    const offer = await this.offersRepository.findBuyNowOfferPreview({
      offerId: input.offerId,
      variantId,
    });

    if (!offer) {
      throw new NotFoundException('Offer not found.');
    }
    if (offer.offerStatus !== 'active' || offer.moderationStatus !== 'approved') {
      throw new BadRequestException('Offer is not available for Buy Now.');
    }

    const variant = variantId ? (offer.variants[0] ?? null) : null;
    if (variantId && (!variant || !variant.isActive)) {
      throw new BadRequestException('Variant is not available for Buy Now.');
    }

    const availableQuantity = variant?.availableQuantity ?? offer.availableQuantity;
    if (quantity > availableQuantity) {
      throw new BadRequestException('Requested quantity exceeds available stock.');
    }

    const thumbnailUrl =
      variant?.mediaAsset?.secureUrl ?? resolveOfferThumbnailUrl(offer.media);

    return {
      shopId: offer.shop.id,
      shopName: offer.shop.shopName,
      offerId: offer.id,
      modelName: offer.modelName,
      variantId: variant?.id ?? null,
      sku: variant?.sku ?? null,
      quantity,
      price: decimalToNumber(variant?.price ?? offer.price),
      thumbnailUrl,
    };
  }
}

function resolveOfferThumbnailUrl(
  media: Array<{
    mediaType: string;
    fileUrl: string;
    mediaAsset: { secureUrl: string } | null;
  }>,
) {
  const thumbnail =
    media.find(
      (item) =>
        item.mediaType === 'thumbnail' &&
        (item.mediaAsset?.secureUrl || item.fileUrl),
    ) ?? media.find((item) => item.mediaAsset?.secureUrl || item.fileUrl);

  return thumbnail?.mediaAsset?.secureUrl ?? thumbnail?.fileUrl ?? null;
}

function decimalToNumber(value: Prisma.Decimal | number | string) {
  return typeof value === 'number' ? value : Number(value);
}
