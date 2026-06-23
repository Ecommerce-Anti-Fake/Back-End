import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma/prisma.service';

@Injectable()
export class FavoritesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listFavoriteOfferIds(userId: string) {
    const favorites = await this.prisma.userFavoriteOffer.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { offerId: true },
    });

    return favorites.map((favorite) => favorite.offerId);
  }

  async addFavoriteOffer(userId: string, offerId: string) {
    await this.prisma.offer.findUniqueOrThrow({
      where: { id: offerId },
      select: { id: true },
    });

    await this.prisma.userFavoriteOffer.upsert({
      where: { userId_offerId: { userId, offerId } },
      update: {},
      create: { userId, offerId },
    });

    return { offerId, isFavorite: true };
  }

  async removeFavoriteOffer(userId: string, offerId: string) {
    await this.prisma.userFavoriteOffer.deleteMany({
      where: { userId, offerId },
    });

    return { offerId, isFavorite: false };
  }
}
