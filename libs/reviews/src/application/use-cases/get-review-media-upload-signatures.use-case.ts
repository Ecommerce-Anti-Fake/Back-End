import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MediaService } from '@media';
import { ReviewsRepository } from '../../infrastructure/persistence/reviews.repository';

@Injectable()
export class GetReviewMediaUploadSignaturesUseCase {
  constructor(
    private readonly reviewsRepository: ReviewsRepository,
    private readonly mediaService: MediaService,
  ) {}

  async execute(input: {
    reviewId: string;
    requesterUserId: string;
    items: Array<{
      assetType: 'IMAGE';
    }>;
  }) {
    const review = await this.reviewsRepository.findReviewOwnedByBuyer(
      input.reviewId,
      input.requesterUserId,
    );
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (input.items.length === 0) {
      throw new BadRequestException('At least one review image is required');
    }

    if (input.items.length > 5) {
      throw new BadRequestException(
        'A review can upload up to 5 images at once',
      );
    }

    return input.items.map((item, index) =>
      this.mediaService.createCloudinaryUploadSignature({
        folder: `reviews/${review.id}/media`,
        requesterUserId: input.requesterUserId,
        assetType: item.assetType,
        sequence: index + 1,
      }),
    );
  }
}
