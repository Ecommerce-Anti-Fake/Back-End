import { Injectable } from '@nestjs/common';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';
import { toOfferResponse } from './products.mapper';

@Injectable()
export class ListOffersUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(shopId?: string) {
    const offers = await this.productRepository.findAllOffers(shopId);
    return offers.map(toOfferResponse);
  }
}
