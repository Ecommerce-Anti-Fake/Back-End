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
      file: { buffer: Buffer | { data?: number[] }; mimetype: string; originalname?: string; size: number };
      issuerName?: string | null;
      documentNumber?: string | null;
    }>;
  }) {
    const batch = await this.repository.findOwnedBatch(input.batchId, input.requesterUserId);
    if (!batch) {
      throw new NotFoundException('Supply batch not found');
    }

    if (batch.shop.shopStatus !== 'verified') {
      throw new BadRequestException('Only active shops can upload batch documents');
    }

    if (input.items.length === 0) {
      throw new BadRequestException('At least one batch document is required');
    }

    const results: Array<ReturnType<typeof toBatchDocumentResponse>> = [];

    for (const item of input.items) {
      if (!item.file?.buffer || !item.file.size) throw new BadRequestException('Batch document file is required');
      const buffer = Buffer.isBuffer(item.file.buffer) ? item.file.buffer : Buffer.from(item.file.buffer.data ?? []);
      if (!buffer.length || buffer.length > 10 * 1024 * 1024) throw new BadRequestException('Batch document must be non-empty and not exceed 10 MB');
      const folder = `batches/${batch.id}/documents`;
      const uploaded = await this.mediaService.uploadCloudinaryBuffer({
        buffer, folder, requesterUserId: input.requesterUserId, assetType: 'RAW',
        mimeType: item.file.mimetype, sequence: results.length + 1,
      });

      const mediaAsset = await this.mediaService.createCloudinaryAsset({
        ownerUserId: input.requesterUserId,
        assetType: 'RAW',
        resourceType: 'BATCH_DOCUMENT',
        publicId: uploaded.publicId,
        secureUrl: uploaded.secureUrl,
        mimeType: item.file.mimetype.trim().toLowerCase(),
        folder,
      });

      const document = await this.repository.createBatchDocument({
        batchId: batch.id,
        mediaAssetId: mediaAsset.id,
        docType: item.docType.trim(),
        fileUrl: uploaded.secureUrl,
        issuerName: item.issuerName?.trim() || null,
        documentNumber: item.documentNumber?.trim() || null,
      });

      results.push(toBatchDocumentResponse(document));
    }

    return results;
  }
}
