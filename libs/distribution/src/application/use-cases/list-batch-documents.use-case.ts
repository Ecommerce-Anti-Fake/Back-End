import { Injectable, NotFoundException } from '@nestjs/common';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';
import { toBatchDocumentResponse } from './batch-document.mapper';

@Injectable()
export class ListBatchDocumentsUseCase {
  constructor(private readonly repository: DistributionPricingRepository) {}

  async execute(input: { batchId: string; requesterUserId: string }) {
    const batch = await this.repository.findOwnedBatch(input.batchId, input.requesterUserId);
    if (!batch) {
      throw new NotFoundException('Supply batch not found');
    }

    const documents = await this.repository.findBatchDocuments(batch.id);
    return documents.map(toBatchDocumentResponse);
  }
}
