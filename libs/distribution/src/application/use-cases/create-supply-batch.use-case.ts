import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';
import { toSupplyBatchResponse } from './network.mapper';

@Injectable()
export class CreateSupplyBatchUseCase {
  constructor(private readonly repository: DistributionPricingRepository) {}

  async execute(input: {
    requesterUserId: string;
    shopId: string;
    productModelId: string;
    distributionNodeId?: string | null;
    batchNumber: string;
    quantity: number;
    sourceName: string;
    countryOfOrigin: string;
    sourceType: string;
    receivedAt: string;
  }) {
    const shop = await this.repository.findOwnedActiveShop(input.shopId, input.requesterUserId);
    if (!shop) {
      throw new NotFoundException('Shop not found, not owned by current user, or not active');
    }

    if (!['MANUFACTURER', 'DISTRIBUTOR'].includes(shop.registrationType)) {
      throw new BadRequestException('Only manufacturer or distributor shops can create supply batches');
    }

    const productModel = await this.repository.findProductModelById(input.productModelId);
    if (!productModel) {
      throw new NotFoundException('Product model not found');
    }

    const batchNumber = input.batchNumber.trim();
    const sourceName = input.sourceName.trim();
    const countryOfOrigin = input.countryOfOrigin.trim();
    const sourceType = input.sourceType.trim();
    if (!batchNumber || !sourceName || !countryOfOrigin || !sourceType) {
      throw new BadRequestException('Batch metadata is required');
    }

    const receivedAt = new Date(input.receivedAt);
    if (Number.isNaN(receivedAt.getTime())) {
      throw new BadRequestException('receivedAt must be a valid ISO datetime');
    }

    const normalizedSourceType = sourceType.trim().toUpperCase();
    if (
      ['PRODUCTION', 'MANUFACTURED', 'MANUFACTURING'].includes(normalizedSourceType) &&
      shop.registrationType !== 'MANUFACTURER'
    ) {
      throw new BadRequestException('Only manufacturer shops can create production batches');
    }

    let distributionNodeId: string | null = input.distributionNodeId ?? null;
    if (shop.registrationType === 'DISTRIBUTOR' && !distributionNodeId) {
      throw new BadRequestException('Distributor shops must create supply batches through an active distribution node');
    }

    if (distributionNodeId) {
      const node = await this.repository.findNodeById(distributionNodeId);
      if (!node || node.shopId !== shop.id) {
        throw new BadRequestException('Distribution node does not belong to the selected shop');
      }

      if (node.relationshipStatus !== 'ACTIVE' || node.shop.shopStatus !== 'active') {
        throw new BadRequestException('Distribution node must be active');
      }
    }

    const batch = await this.repository.createBatch({
      shopId: shop.id,
      productModelId: productModel.id,
      distributionNodeId,
      batchNumber,
      quantity: input.quantity,
      sourceName,
      countryOfOrigin,
      sourceType,
      receivedAt,
    });

    return toSupplyBatchResponse(batch);
  }
}
