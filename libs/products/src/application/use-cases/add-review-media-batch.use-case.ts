import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MediaService } from '@media';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';
import { toReviewMediaResponse } from './products.mapper';

@Injectable()
export class AddReviewMediaBatchUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly mediaService: MediaService,
  ) {}

  async execute(input: {
    reviewId: string;
    requesterUserId: string;
    items: Array<{
      assetType: 'IMAGE';
      mimeType: string;
      fileUrl: string;
      publicId: string;
    }>;
  }) {
    const review = await this.productRepository.findReviewOwnedByBuyer(input.reviewId, input.requesterUserId);
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (input.items.length === 0) {
      throw new BadRequestException('At least one review image is required');
    }

    if (input.items.length > 5) {
      throw new BadRequestException('A review can add up to 5 images at once');
    }

    const results: Array<ReturnType<typeof toReviewMediaResponse>> = [];

    for (const item of input.items) {
      if (!this.mediaService.isOwnedCloudinaryUrl(item.fileUrl)) {
        throw new BadRequestException('Review image URL must belong to the configured Cloudinary cloud');
      }

      const publicId = item.publicId.trim();
      if (!publicId.startsWith(`reviews/${review.id}/media/`)) {
        throw new BadRequestException('Review image public ID does not belong to the review media folder');
      }

      const mimeType = item.mimeType.trim().toLowerCase();
      if (!mimeType.startsWith('image/')) {
        throw new BadRequestException('Review media must be an image');
      }

      const mediaAsset = await this.mediaService.createCloudinaryAsset({
        ownerUserId: input.requesterUserId,
        assetType: item.assetType,
        resourceType: 'REVIEW_IMAGE',
        publicId,
        secureUrl: item.fileUrl,
        mimeType,
        folder: `reviews/${review.id}/media`,
      });

      const media = await this.productRepository.createReviewMedia({
        reviewId: review.id,
        mediaAssetId: mediaAsset.id,
        fileUrl: item.fileUrl,
        mimeType,
        publicId,
      });

      results.push(toReviewMediaResponse(media));
    }

    return results;
  }
}
