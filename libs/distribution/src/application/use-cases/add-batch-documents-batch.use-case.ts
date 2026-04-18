import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MediaService } from '@media';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';
import { toBatchDocumentResponse } from './batch-document.mapper';

@Injectable()
export class AddBatchDocumentsBatchUseCase {
  constructor(
    private readonly repository: DistributionPricingRepository,
    private readonly mediaService: MediaService,
  ) {}

  async execute(input: {
    batchId: string;
    requesterUserId: string;
    items: Array<{
      docType: string;
      mimeType: string;
      fileUrl: string;
      publicId: string;
      issuerName?: string | null;
      documentNumber?: string | null;
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

    const results: Array<ReturnType<typeof toBatchDocumentResponse>> = [];

    for (const item of input.items) {
      if (!this.mediaService.isOwnedCloudinaryUrl(item.fileUrl)) {
        throw new BadRequestException('Batch document URL must belong to the configured Cloudinary cloud');
      }

      const publicId = item.publicId.trim();
      if (!publicId.startsWith(`batches/${batch.id}/documents/`)) {
        throw new BadRequestException('Batch document public ID does not belong to the batch documents folder');
      }

      const mediaAsset = await this.mediaService.createCloudinaryAsset({
        ownerUserId: input.requesterUserId,
        assetType: 'RAW',
        resourceType: 'BATCH_DOCUMENT',
        publicId,
        secureUrl: item.fileUrl,
        mimeType: item.mimeType.trim().toLowerCase(),
        folder: `batches/${batch.id}/documents`,
      });

      const document = await this.repository.createBatchDocument({
        batchId: batch.id,
        mediaAssetId: mediaAsset.id,
        docType: item.docType.trim(),
        fileUrl: item.fileUrl,
        issuerName: item.issuerName?.trim() || null,
        documentNumber: item.documentNumber?.trim() || null,
      });

      results.push(toBatchDocumentResponse(document));
    }

    return results;
  }
}
