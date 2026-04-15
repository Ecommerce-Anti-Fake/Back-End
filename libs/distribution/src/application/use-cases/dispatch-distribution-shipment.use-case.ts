import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';
import { toDistributionShipmentResponse } from './network.mapper';

@Injectable()
export class DispatchDistributionShipmentUseCase {
  constructor(private readonly repository: DistributionPricingRepository) {}

  async execute(input: { requesterUserId: string; shipmentId: string }) {
    const shipment = await this.repository.findDispatchableShipmentById(input.shipmentId, input.requesterUserId);
    if (!shipment) {
      throw new NotFoundException('Distribution shipment not found or not dispatchable by current user');
    }

    if (shipment.shipmentStatus !== 'DRAFT') {
      throw new BadRequestException('Only draft shipments can be dispatched');
    }

    const dispatchedShipment = await this.repository.dispatchShipment(shipment.id);
    return toDistributionShipmentResponse(dispatchedShipment);
  }
}
