import { BadRequestException, Injectable } from '@nestjs/common';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';
import { toInventorySummaryResponse } from './network.mapper';

@Injectable()
export class GetInventorySummaryUseCase {
  constructor(private readonly repository: DistributionPricingRepository) {}

  async execute(input: { requesterUserId: string; shopId?: string }) {
    const summary = await this.repository.getInventorySummary(input.requesterUserId, input.shopId);
    if (!summary) {
      throw new BadRequestException('Shop not found or does not belong to current user');
    }

    return toInventorySummaryResponse(summary);
  }
}
