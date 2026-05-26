import { Injectable } from '@nestjs/common';
import { FavoriteOfferMessage } from '@contracts';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';

@Injectable()
export class RemoveFavoriteOfferUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  execute(payload: FavoriteOfferMessage) {
    return this.productRepository.removeFavoriteOffer(payload.userId, payload.offerId);
  }
}
