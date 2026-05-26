import { Injectable } from '@nestjs/common';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';

@Injectable()
export class ListFavoriteOffersUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(userId: string) {
    const offerIds = await this.productRepository.listFavoriteOfferIds(userId);
    return { offerIds };
  }
}
