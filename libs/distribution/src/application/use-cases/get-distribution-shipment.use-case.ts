import { Injectable, NotFoundException } from '@nestjs/common';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';
import { toDistributionShipmentResponse } from './network.mapper';

@Injectable()
export class GetDistributionShipmentUseCase {
  constructor(private readonly repository: DistributionPricingRepository) {}

  async execute(input: { requesterUserId: string; shipmentId: string }) {
    const shipment = await this.repository.findShipmentByIdForUser(input.shipmentId, input.requesterUserId);
    if (!shipment) {
      throw new NotFoundException('Distribution shipment not found');
    }

    return toDistributionShipmentResponse(shipment);
  }
}
