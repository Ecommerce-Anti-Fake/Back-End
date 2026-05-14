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

    const order = await this.productRepository.findCompletedOrderForOfferReview(input.offerId, input.fromUserId);
    if (!order) {
      throw new NotFoundException('Completed order for this offer not found');
    }

    if (order.reviews.length > 0) {
      throw new BadRequestException('This order has already been reviewed');
    }

    const review = await this.productRepository.createReview({
      orderId: order.id,
      fromUserId: input.fromUserId,
      toUserId: order.shop.ownerUserId,
      rating,
      comment: input.comment?.trim() || null,
    });

    return toOfferReviewResponse(review);
  }
}
