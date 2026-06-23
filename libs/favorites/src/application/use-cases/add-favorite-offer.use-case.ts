import { Injectable } from '@nestjs/common';
import { FavoriteOfferMessage } from '@contracts';
import { FavoritesRepository } from '../../infrastructure/persistence/favorites.repository';

@Injectable()
export class AddFavoriteOfferUseCase {
  constructor(private readonly favoritesRepository: FavoritesRepository) {}

  execute(payload: FavoriteOfferMessage) {
    return this.favoritesRepository.addFavoriteOffer(
      payload.userId,
      payload.offerId,
    );
  }
}
