import { Injectable } from '@nestjs/common';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';
import { toOfferReviewResponse } from './products.mapper';

@Injectable()
export class ListOfferReviewsUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(offerId: string) {
    const reviews = await this.productRepository.findOfferReviews(offerId);
    const items = reviews.map(toOfferReviewResponse);
    const total = items.length;
    const averageRating = total
      ? Number((items.reduce((sum, review) => sum + review.rating, 0) / total).toFixed(1))
      : 0;

    return {
      total,
      averageRating,
      items,
    };
  }
}
