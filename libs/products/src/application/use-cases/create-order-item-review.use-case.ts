import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';
import { toOfferReviewResponse } from './products.mapper';

@Injectable()
export class CreateOrderItemReviewUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(input: {
    orderItemId: string;
    fromUserId: string;
    rating: number;
    comment?: string | null;
  }) {
    const rating = Number(input.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const orderItem = await this.productRepository.findCompletedOrderItemForReview(input.orderItemId, input.fromUserId);
    if (!orderItem) {
      throw new NotFoundException('Completed order item not found');
    }

    const existingReview = orderItem.reviews[0];
    if (existingReview) {
      const review = await this.productRepository.updateReview(existingReview.id, {
        rating,
        comment: input.comment?.trim() || null,
      });

      return toOfferReviewResponse(review);
    }

    const review = await this.productRepository.createReview({
      orderId: orderItem.orderId,
      orderItemId: orderItem.id,
      fromUserId: input.fromUserId,
      toUserId: orderItem.order.shop.ownerUserId,
      rating,
      comment: input.comment?.trim() || null,
    });

    return toOfferReviewResponse(review);
  }
}
