import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';
import { toOfferDocumentResponse } from './products.mapper';

@Injectable()
export class ListOfferDocumentsUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(offerId: string) {
    const offer = await this.productRepository.findOfferById(offerId);
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    const documents = await this.productRepository.findOfferDocuments(offerId);
    return documents.map(toOfferDocumentResponse);
  }
}
