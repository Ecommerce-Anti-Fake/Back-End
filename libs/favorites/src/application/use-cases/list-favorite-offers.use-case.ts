import { Injectable } from '@nestjs/common';
import { FavoritesRepository } from '../../infrastructure/persistence/favorites.repository';

@Injectable()
export class ListFavoriteOffersUseCase {
  constructor(private readonly favoritesRepository: FavoritesRepository) {}

  async execute(userId: string) {
    const offerIds =
      await this.favoritesRepository.listFavoriteOfferIds(userId);
    return { offerIds };
  }
}
