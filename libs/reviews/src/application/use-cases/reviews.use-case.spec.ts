import { BadRequestException } from '@nestjs/common';
import { AddReviewMediaBatchUseCase } from './add-review-media-batch.use-case';
import { CreateOfferReviewUseCase } from './create-offer-review.use-case';
import { CreateOrderItemReviewUseCase } from './create-order-item-review.use-case';
import { GetReviewMediaUploadSignaturesUseCase } from './get-review-media-upload-signatures.use-case';

describe('review eligibility use cases in ReviewsModule', () => {
  const repository = {
    findLatestCompletedOrderItemForOffer: jest.fn(),
    findCompletedOrderItemForReview: jest.fn(),
    createReview: jest.fn(),
    updateReview: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates the review attached to the latest eligible purchase', async () => {
    repository.findLatestCompletedOrderItemForOffer.mockResolvedValue(
      orderItem({ reviewId: 'review-1' }),
    );
    repository.updateReview.mockResolvedValue(
      review({ id: 'review-1', rating: 5 }),
    );
    const useCase = new CreateOfferReviewUseCase(repository as never);

    const result = await useCase.execute({
      offerId: 'offer-1',
      fromUserId: 'buyer-1',
      rating: 5,
      comment: ' Chinh hang ',
    });

    expect(repository.updateReview).toHaveBeenCalledWith('review-1', {
      rating: 5,
      comment: 'Chinh hang',
    });
    expect(repository.createReview).not.toHaveBeenCalled();
    expect(result.rating).toBe(5);
  });

  it('creates one review for an explicitly eligible order item', async () => {
    repository.findCompletedOrderItemForReview.mockResolvedValue(orderItem());
    repository.createReview.mockResolvedValue(review({ rating: 4 }));
    const useCase = new CreateOrderItemReviewUseCase(repository as never);

    const result = await useCase.execute({
      orderItemId: 'item-1',
      fromUserId: 'buyer-1',
      rating: 4,
      comment: ' Tot ',
    });

    expect(repository.createReview).toHaveBeenCalledWith({
      orderId: 'order-1',
      orderItemId: 'item-1',
      fromUserId: 'buyer-1',
      toUserId: 'seller-1',
      rating: 4,
      comment: 'Tot',
    });
    expect(result.rating).toBe(4);
  });
});

describe('review media use cases in ReviewsModule', () => {
  const repository = {
    findReviewOwnedByBuyer: jest.fn(),
    createReviewMedia: jest.fn(),
  };
  const mediaService = {
    createCloudinaryUploadSignature: jest.fn(),
    isOwnedCloudinaryUrl: jest.fn(),
    createCloudinaryAsset: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repository.findReviewOwnedByBuyer.mockResolvedValue({ id: 'review-1' });
  });

  it('creates an owned upload signature inside the review folder', async () => {
    mediaService.createCloudinaryUploadSignature.mockReturnValue({
      signature: 'signed',
    });
    const useCase = new GetReviewMediaUploadSignaturesUseCase(
      repository as never,
      mediaService as never,
    );

    const result = await useCase.execute({
      reviewId: 'review-1',
      requesterUserId: 'buyer-1',
      items: [{ assetType: 'IMAGE' }],
    });

    expect(mediaService.createCloudinaryUploadSignature).toHaveBeenCalledWith({
      folder: 'reviews/review-1/media',
      requesterUserId: 'buyer-1',
      assetType: 'IMAGE',
      sequence: 1,
    });
    expect(result).toEqual([{ signature: 'signed' }]);
  });

  it('rejects review media URLs outside the configured Cloudinary cloud', async () => {
    mediaService.isOwnedCloudinaryUrl.mockReturnValue(false);
    const useCase = new AddReviewMediaBatchUseCase(
      repository as never,
      mediaService as never,
    );

    await expect(
      useCase.execute({
        reviewId: 'review-1',
        requesterUserId: 'buyer-1',
        items: [
          {
            assetType: 'IMAGE',
            mimeType: 'image/jpeg',
            fileUrl: 'https://untrusted.example/image.jpg',
            publicId: 'reviews/review-1/media/image',
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.createReviewMedia).not.toHaveBeenCalled();
  });
});

function orderItem(input: { reviewId?: string } = {}) {
  return {
    id: 'item-1',
    orderId: 'order-1',
    reviews: input.reviewId ? [{ id: input.reviewId }] : [],
    order: { shop: { ownerUserId: 'seller-1' } },
  };
}

function review(input: { id?: string; rating?: number } = {}) {
  return {
    id: input.id ?? 'review-new',
    orderId: 'order-1',
    orderItemId: 'item-1',
    rating: input.rating ?? 5,
    comment: 'Chinh hang',
    createdAt: new Date('2026-06-22T00:00:00.000Z'),
    orderItem: { offerId: 'offer-1' },
    fromUser: { displayName: 'Buyer', email: null, phone: null },
    media: [],
  };
}
