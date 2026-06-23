import { Injectable } from '@nestjs/common';
import { OffersRepository } from '../../infrastructure/persistence/offers.repository';
import { toOfferBatchLinkResponse } from './offers.mapper';

@Injectable()
export class ListOfferBatchLinksUseCase {
  constructor(private readonly productRepository: OffersRepository) {}

  async execute(offerId: string) {
    const links = await this.productRepository.findOfferBatchLinks(offerId);
    return links.map(toOfferBatchLinkResponse);
  }
}
