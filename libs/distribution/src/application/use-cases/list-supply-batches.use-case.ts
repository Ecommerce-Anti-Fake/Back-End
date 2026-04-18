import { BadRequestException, Injectable } from '@nestjs/common';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';
import { toSupplyBatchResponse } from './network.mapper';

@Injectable()
export class ListSupplyBatchesUseCase {
  constructor(private readonly repository: DistributionPricingRepository) {}

  async execute(input: {
    requesterUserId: string;
    shopId?: string;
  }) {
    if (input.shopId) {
      const ownedShop = await this.repository.findOwnedActiveShop(input.shopId, input.requesterUserId);
      if (!ownedShop) {
        throw new BadRequestException('Shop not found, not owned by current user, or not active');
      }
    }

    const batches = await this.repository.findBatchesByOwner(input.requesterUserId, input.shopId);
    return batches.map(toSupplyBatchResponse);
  }
}
