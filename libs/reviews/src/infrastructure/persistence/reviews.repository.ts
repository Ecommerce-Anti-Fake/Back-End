import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma/prisma.service';

@Injectable()
export class ReviewsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findOfferReviews(offerId: string) {
    return this.prisma.review.findMany({
      where: {
        OR: [
          { orderItem: { offerId } },
          { orderItemId: null, order: { items: { some: { offerId } } } },
        ],
      },
      include: this.reviewInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  findLatestCompletedOrderItemForOffer(offerId: string, buyerUserId: string) {
    return this.prisma.orderItem.findFirst({
      where: {
        offerId,
        order: {
          buyerUserId,
          OR: [
            { orderStatus: 'completed' },
            { fulfillmentStatus: 'DELIVERED' },
          ],
        },
      },
      include: this.orderItemReviewInclude(buyerUserId),
      orderBy: { order: { createdAt: 'desc' } },
    });
  }

  findCompletedOrderItemForReview(orderItemId: string, buyerUserId: string) {
    return this.prisma.orderItem.findFirst({
      where: {
        id: orderItemId,
        order: {
          buyerUserId,
          OR: [
            { orderStatus: 'completed' },
            { fulfillmentStatus: 'DELIVERED' },
          ],
        },
      },
      include: this.orderItemReviewInclude(buyerUserId),
    });
  }

  createReview(data: {
    orderId: string;
    orderItemId: string;
    fromUserId: string;
    toUserId: string;
    rating: number;
    comment: string | null;
  }) {
    return this.prisma.review.create({ data, include: this.reviewInclude() });
  }

  updateReview(
    reviewId: string,
    data: { rating: number; comment: string | null },
  ) {
    return this.prisma.review.update({
      where: { id: reviewId },
      data,
      include: this.reviewInclude(),
    });
  }

  findReviewOwnedByBuyer(reviewId: string, buyerUserId: string) {
    return this.prisma.review.findFirst({
      where: { id: reviewId, fromUserId: buyerUserId },
      include: {
        media: { include: { mediaAsset: true }, orderBy: { createdAt: 'asc' } },
      },
    });
  }

  createReviewMedia(data: {
    reviewId: string;
    mediaAssetId: string | null;
    fileUrl: string;
    mimeType: string | null;
    publicId: string | null;
  }) {
    return this.prisma.reviewMedia.create({
      data,
      include: { mediaAsset: true },
    });
  }

  private reviewInclude() {
    return {
      orderItem: { select: { offerId: true } },
      fromUser: { select: { displayName: true, email: true, phone: true } },
      media: {
        include: { mediaAsset: true },
        orderBy: { createdAt: 'asc' as const },
      },
    };
  }

  private orderItemReviewInclude(buyerUserId: string) {
    return {
      order: { include: { shop: { select: { ownerUserId: true } } } },
      reviews: {
        where: { fromUserId: buyerUserId },
        include: {
          media: {
            include: { mediaAsset: true },
            orderBy: { createdAt: 'asc' as const },
          },
        },
        orderBy: { createdAt: 'desc' as const },
        take: 1,
      },
    };
  }
}
