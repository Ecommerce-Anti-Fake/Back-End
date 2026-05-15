import { Injectable } from '@nestjs/common';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';
import { toAdminInventoryAuditResponse } from './network.mapper';

@Injectable()
export class GetAdminInventoryAuditUseCase {
  constructor(private readonly repository: DistributionPricingRepository) {}

  async execute(input: {
    batchId?: string;
    shopId?: string;
    offerId?: string;
    orderId?: string;
    search?: string;
  }) {
    const batches = await this.repository.findAdminInventoryAuditBatches(input);
    return toAdminInventoryAuditResponse(batches);
  }
}
