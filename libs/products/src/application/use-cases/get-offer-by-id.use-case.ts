import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';
import { toOfferResponse } from './products.mapper';

@Injectable()
export class GetOfferByIdUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(id: string) {
    const offer = await this.productRepository.findOfferById(id);
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    return toOfferResponse(offer);
  }
}
