import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ReviewsRepository } from '../../infrastructure/persistence/reviews.repository';
import { toOfferReviewResponse } from '../reviews.mapper';

@Injectable()
export class CreateOfferReviewUseCase {
  constructor(private readonly reviewsRepository: ReviewsRepository) {}

  async execute(input: {
    offerId: string;
    fromUserId: string;
    rating: number;
    comment?: string | null;
  }) {
    const rating = Number(input.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const latestOrderItem =
      await this.reviewsRepository.findLatestCompletedOrderItemForOffer(
        input.offerId,
        input.fromUserId,
      );
    if (!latestOrderItem) {
      throw new NotFoundException(
        'Completed order item for this offer not found',
      );
    }

    const existingReview = latestOrderItem.reviews[0];
    if (existingReview) {
      const review = await this.reviewsRepository.updateReview(
        existingReview.id,
        {
          rating,
          comment: input.comment?.trim() || null,
        },
      );

      return toOfferReviewResponse(review);
    }

    const review = await this.reviewsRepository.createReview({
      orderId: latestOrderItem.orderId,
      orderItemId: latestOrderItem.id,
      fromUserId: input.fromUserId,
      toUserId: latestOrderItem.order.shop.ownerUserId,
      rating,
      comment: input.comment?.trim() || null,
    });

    return toOfferReviewResponse(review);
  }
}
