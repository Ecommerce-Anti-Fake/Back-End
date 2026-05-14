import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';
import { toOfferReviewResponse } from './products.mapper';

@Injectable()
export class CreateOfferReviewUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

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

    const reviewableItem = await this.productRepository.findReviewableOrderItemForOffer(input.offerId, input.fromUserId);
    if (reviewableItem) {
      const review = await this.productRepository.createReview({
        orderId: reviewableItem.orderId,
        orderItemId: reviewableItem.id,
        fromUserId: input.fromUserId,
        toUserId: reviewableItem.order.shop.ownerUserId,
        rating,
        comment: input.comment?.trim() || null,
      });

      return toOfferReviewResponse(review);
    }

    const existingReview = await this.productRepository.findLatestOfferReviewByBuyer(input.offerId, input.fromUserId);
    if (existingReview) {
      const review = await this.productRepository.updateReview(existingReview.id, {
        rating,
        comment: input.comment?.trim() || null,
      });

      return toOfferReviewResponse(review);
    }

    throw new NotFoundException('Completed order item for this offer not found');
  }
}
