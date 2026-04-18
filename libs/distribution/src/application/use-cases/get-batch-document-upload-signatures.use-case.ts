import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MediaService } from '@media';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';

@Injectable()
export class GetBatchDocumentUploadSignaturesUseCase {
  constructor(
    private readonly repository: DistributionPricingRepository,
    private readonly mediaService: MediaService,
  ) {}

  async execute(input: {
    batchId: string;
    requesterUserId: string;
    items: Array<{
      docType: string;
    }>;
  }) {
    const batch = await this.repository.findOwnedBatch(input.batchId, input.requesterUserId);
    if (!batch) {
      throw new NotFoundException('Supply batch not found');
    }

    if (batch.shop.shopStatus !== 'active') {
      throw new BadRequestException('Only active shops can upload batch documents');
    }

    if (input.items.length === 0) {
      throw new BadRequestException('At least one batch document is required');
    }

    return input.items.map((_, index) =>
      this.mediaService.createCloudinaryUploadSignature({
        folder: `batches/${batch.id}/documents`,
        requesterUserId: input.requesterUserId,
        assetType: 'RAW',
        sequence: index + 1,
      }),
    );
  }
}
