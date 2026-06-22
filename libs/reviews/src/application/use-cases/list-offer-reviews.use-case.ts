import { Injectable } from '@nestjs/common';
import { ReviewsRepository } from '../../infrastructure/persistence/reviews.repository';
import { toOfferReviewResponse } from '../reviews.mapper';

@Injectable()
export class ListOfferReviewsUseCase {
  constructor(private readonly reviewsRepository: ReviewsRepository) {}

  async execute(offerId: string) {
    const reviews = await this.reviewsRepository.findOfferReviews(offerId);
    const items = reviews.map(toOfferReviewResponse);
    const total = items.length;
    const averageRating = total
      ? Number(
          (
            items.reduce((sum, review) => sum + review.rating, 0) / total
          ).toFixed(1),
        )
      : 0;

    return {
      total,
      averageRating,
      items,
    };
  }
}
