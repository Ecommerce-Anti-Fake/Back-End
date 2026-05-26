import { Injectable } from '@nestjs/common';
import { FavoriteOfferMessage } from '@contracts';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';

@Injectable()
export class AddFavoriteOfferUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  execute(payload: FavoriteOfferMessage) {
    return this.productRepository.addFavoriteOffer(payload.userId, payload.offerId);
  }
}
