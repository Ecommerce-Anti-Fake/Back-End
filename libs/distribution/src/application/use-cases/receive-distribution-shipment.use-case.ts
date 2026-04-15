import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';
import { toDistributionShipmentResponse } from './network.mapper';

@Injectable()
export class ReceiveDistributionShipmentUseCase {
  constructor(private readonly repository: DistributionPricingRepository) {}

  async execute(input: { requesterUserId: string; shipmentId: string }) {
    const shipment = await this.repository.findReceivableShipmentById(input.shipmentId, input.requesterUserId);
    if (!shipment) {
      throw new NotFoundException('Distribution shipment not found or not receivable by current user');
    }

    if (shipment.shipmentStatus !== 'IN_TRANSIT') {
      throw new BadRequestException('Only in-transit shipments can be received');
    }

    const receivedShipment = await this.repository.receiveShipment(shipment.id, shipment.toNodeId);
    return toDistributionShipmentResponse(receivedShipment);
  }
}
