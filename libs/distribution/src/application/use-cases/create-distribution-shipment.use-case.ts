import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';
import { toDistributionShipmentResponse } from './network.mapper';

@Injectable()
export class CreateDistributionShipmentUseCase {
  constructor(private readonly repository: DistributionPricingRepository) {}

  async execute(input: {
    requesterUserId: string;
    networkId: string;
    fromNodeId: string;
    toNodeId: string;
    shipmentCode: string;
    note?: string | null;
    items: Array<{
      batchId: string;
      productModelId: string;
      quantity: number;
      unitCost?: number | null;
    }>;
  }) {
    const network = await this.repository.findOwnedNetworkByUser(input.networkId, input.requesterUserId);
    if (!network) {
      throw new NotFoundException('Distribution network not found or not owned by current user');
    }

    const fromNode = await this.repository.findNodeById(input.fromNodeId);
    const toNode = await this.repository.findNodeById(input.toNodeId);
    if (!fromNode || !toNode) {
      throw new BadRequestException('Distribution nodes are invalid');
    }

    if (fromNode.networkId !== input.networkId || toNode.networkId !== input.networkId) {
      throw new BadRequestException('Distribution nodes must belong to the selected network');
    }

    if (fromNode.id === toNode.id) {
      throw new BadRequestException('fromNodeId and toNodeId must be different');
    }

    const isParentChildRelation =
      toNode.parentNodeId === fromNode.id || fromNode.parentNodeId === toNode.id;
    if (!isParentChildRelation) {
      throw new BadRequestException('Shipments are only allowed between directly related distribution nodes');
    }

    if (input.items.length === 0) {
      throw new BadRequestException('Shipment must include at least one item');
    }

    const normalizedCode = input.shipmentCode.trim();
    if (!normalizedCode) {
      throw new BadRequestException('Shipment code is required');
    }

    const normalizedItems = input.items.map((item) => ({
      batchId: item.batchId.trim(),
      productModelId: item.productModelId.trim(),
      quantity: item.quantity,
      unitCost: item.unitCost ?? null,
    }));

    const invalidItem = normalizedItems.find(
      (item) => !item.batchId || !item.productModelId || item.quantity < 1 || (item.unitCost !== null && item.unitCost < 0),
    );
    if (invalidItem) {
      throw new BadRequestException('Shipment items are invalid');
    }

    const uniqueBatchIds = [...new Set(normalizedItems.map((item) => item.batchId))];
    if (uniqueBatchIds.length !== normalizedItems.length) {
      throw new BadRequestException('Each batch can only appear once in a shipment');
    }

    const batches = await this.repository.findBatchesByIdsAndNode(uniqueBatchIds, fromNode.id);
    if (batches.length !== uniqueBatchIds.length) {
      throw new BadRequestException('One or more batches do not belong to the source distribution node');
    }

    const batchMap = new Map(batches.map((batch) => [batch.id, batch]));
    for (const item of normalizedItems) {
      const batch = batchMap.get(item.batchId);
      if (!batch || batch.productModelId !== item.productModelId) {
        throw new BadRequestException('Shipment item product model does not match its batch');
      }
    }

    const shipment = await this.repository.createShipment({
      networkId: input.networkId,
      fromNodeId: fromNode.id,
      toNodeId: toNode.id,
      shipmentCode: normalizedCode,
      note: input.note?.trim() || null,
      items: normalizedItems,
    });

    return toDistributionShipmentResponse(shipment);
  }
}
