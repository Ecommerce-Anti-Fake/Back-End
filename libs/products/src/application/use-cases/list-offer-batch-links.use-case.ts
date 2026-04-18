import { Injectable } from '@nestjs/common';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';
import { toOfferBatchLinkResponse } from './products.mapper';

@Injectable()
export class ListOfferBatchLinksUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(offerId: string) {
    const links = await this.productRepository.findOfferBatchLinks(offerId);
    return links.map(toOfferBatchLinkResponse);
  }
}
