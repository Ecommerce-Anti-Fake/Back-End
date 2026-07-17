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
      throw new BadRequestException('Số lượng phải lớn hơn hoặc bằng 1.');
    }

    const variantId = input.variantId ?? null;
    const offer = await this.offersRepository.findBuyNowOfferPreview({
      offerId: input.offerId,
      variantId,
    });

    if (!offer) {
      throw new NotFoundException('Không tìm thấy offer.');
    }
    if (offer.offerStatus !== 'active' || offer.moderationStatus !== 'approved') {
      throw new BadRequestException('Offer không khả dụng để Mua ngay.');
    }

    const variant = variantId ? (offer.variants[0] ?? null) : null;
    if (variantId && (!variant || !variant.isActive)) {
      throw new BadRequestException('Variant không khả dụng để Mua ngay.');
    }

    if (!variant) {
      throw new BadRequestException('Vui lòng chọn variant để Mua ngay.');
    }
    const availableQuantity = variant.availableQuantity;
    if (quantity > availableQuantity) {
      throw new BadRequestException('Số lượng yêu cầu vượt quá tồn kho.');
    }

    const thumbnailUrl =
      variant?.mediaAsset?.secureUrl ?? resolveOfferThumbnailUrl(offer.media);

    if (variant.price === null) {
      throw new BadRequestException('Variant chưa được cấu hình giá.');
    }
    return {
      shopId: offer.shop.id,
      shopName: offer.shop.shopName,
      offerId: offer.id,
      modelName: offer.modelName,
      variantId: variant?.id ?? null,
      sku: variant?.sku ?? null,
      quantity,
      price: decimalToNumber(variant.price),
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
