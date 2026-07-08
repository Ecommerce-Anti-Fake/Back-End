import { Injectable } from '@nestjs/common';
import { AdminOffersLookupMessage } from '@contracts';
import { OffersRepository } from '../../infrastructure/persistence/offers.repository';

@Injectable()
export class ListAdminOffersUseCase {
  constructor(private readonly offersRepository: OffersRepository) {}

  async execute(input: AdminOffersLookupMessage = {}) {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 10));
    const result = await this.offersRepository.findAdminOffers({
      ...input,
      page,
      pageSize,
    });

    return {
      page,
      pageSize,
      totalItems: result.total,
      totalPages: Math.ceil(result.total / pageSize),
      items: result.items.map((offer) => {
        const thumbnailMedia =
          offer.media.find(
            (media) =>
              media.mediaType === 'thumbnail' &&
              (media.mediaAsset?.secureUrl || media.fileUrl),
          ) ??
          offer.media.find(
            (media) => media.mediaAsset?.secureUrl || media.fileUrl,
          );

        return {
          id: offer.id,
          title: offer.title,
          thumbnail:
            thumbnailMedia?.mediaAsset?.secureUrl ??
            thumbnailMedia?.fileUrl ??
            null,
          price: decimalToNumber(offer.price),
          currency: offer.currency,
          shop: { id: offer.shop.id, name: offer.shop.shopName },
          category: { id: offer.category.id, name: offer.category.name },
          verificationLevel: offer.verificationLevel,
          offerStatus: offer.offerStatus,
          moderationStatus: offer.moderationStatus,
          createdAt: offer.createdAt,
        };
      }),
    };
  }
}

function decimalToNumber(value: unknown): number {
  if (value && typeof value === 'object' && 'toNumber' in value) {
    return (value as { toNumber(): number }).toNumber();
  }
  return Number(value);
}
