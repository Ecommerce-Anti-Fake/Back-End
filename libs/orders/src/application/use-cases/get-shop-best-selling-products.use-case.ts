import { PrismaService } from '@database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { ShopBestSellingProductDto } from '../dto';

@Injectable()
export class GetShopBestSellingProductsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    shopId: string,
    limit: number = 10,
  ): Promise<ShopBestSellingProductDto[]> {
    const items = await this.prisma.orderItem.findMany({
      where: {
        orderShopGroup: { is: { shopId, fulfillmentStatus: 'DELIVERED' } },
        order: { orderStatus: 'completed' },
      },
      include: {
        offer: {
          include: {
            media: { include: { mediaAsset: true } },
          },
        },
      },
    });

    const bestSellingMap = new Map<
      string,
      {
        id: string;
        title: string;
        price: number;
        currency: string;
        availableQuantity: number;
        soldQuantity: number;
        offerStatus: string;
        thumbnailUrl: string | null;
        createdAt: Date;
      }
    >();

    for (const item of items) {
      const offer = item.offer;
      const thumbnailMedia =
        offer.media.find(
          (media) =>
            media.mediaType === 'thumbnail' &&
            (media.mediaAsset?.secureUrl || media.fileUrl),
        ) ??
        offer.media.find(
          (media) => media.mediaAsset?.secureUrl || media.fileUrl,
        );
      const current = bestSellingMap.get(item.offerId) ?? {
        id: item.offerId,
        title: item.offerTitleSnapshot,
        price: Number(offer.price),
        currency: offer.currency,
        availableQuantity: offer.availableQuantity,
        offerStatus: offer.offerStatus,
        thumbnailUrl:
          thumbnailMedia?.mediaAsset?.secureUrl ??
          thumbnailMedia?.fileUrl ??
          null,
        createdAt: offer.createdAt,
        soldQuantity: 0,
      };

      current.soldQuantity += item.quantity;
      bestSellingMap.set(item.offerId, current);
    }

    return Array.from(bestSellingMap.values())
      .sort((a, b) => b.soldQuantity - a.soldQuantity)
      .slice(0, limit);
  }
}
