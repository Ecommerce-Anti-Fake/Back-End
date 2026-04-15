import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';
import { toDistributionShipmentResponse } from './network.mapper';

@Injectable()
export class CancelDistributionShipmentUseCase {
  constructor(private readonly repository: DistributionPricingRepository) {}

  async execute(input: { requesterUserId: string; shipmentId: string }) {
    const shipment = await this.repository.findDispatchableShipmentById(input.shipmentId, input.requesterUserId);
    if (!shipment) {
      throw new NotFoundException('Distribution shipment not found or not cancellable by current user');
    }

    if (shipment.shipmentStatus !== 'DRAFT') {
      throw new BadRequestException('Only draft shipments can be cancelled');
    }

    const cancelledShipment = await this.repository.cancelShipment(shipment.id);
    return toDistributionShipmentResponse(cancelledShipment);
  }
}
