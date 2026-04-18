import { Injectable, NotFoundException } from '@nestjs/common';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';
import { toSupplyBatchDetailResponse } from './network.mapper';

@Injectable()
export class GetSupplyBatchDetailUseCase {
  constructor(private readonly repository: DistributionPricingRepository) {}

  async execute(input: { requesterUserId: string; batchId: string }) {
    const batch = await this.repository.findOwnedBatchDetail(input.batchId, input.requesterUserId);
    if (!batch) {
      throw new NotFoundException('Supply batch not found or does not belong to current user');
    }

    return toSupplyBatchDetailResponse(batch);
  }
}
