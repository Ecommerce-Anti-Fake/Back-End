import { Injectable } from '@nestjs/common';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';
import { toOfferResponse } from './products.mapper';

@Injectable()
export class ListOffersUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(input: { shopId?: string; sellerUserId?: string; includeInactive?: boolean } = {}) {
    const offers = await this.productRepository.findAllOffers(input);
    return offers.map(toOfferResponse);
  }
}
