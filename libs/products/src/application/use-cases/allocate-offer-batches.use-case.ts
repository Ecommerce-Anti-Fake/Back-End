import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';
import { toOfferBatchLinkResponse } from './products.mapper';

@Injectable()
export class AllocateOfferBatchesUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(input: {
    offerId: string;
    requesterUserId: string;
    items: Array<{
      batchId: string;
      allocatedQuantity: number;
    }>;
  }) {
    const ownedOffer = await this.productRepository.findOwnedOffer(input.offerId, input.requesterUserId);
    if (!ownedOffer) {
      throw new NotFoundException('Offer not found or does not belong to current user');
    }

    if (ownedOffer.shop.shopStatus !== 'active') {
      throw new BadRequestException('Only active shops can manage offer inventory allocation');
    }

    const normalizedItems = input.items.map((item) => ({
      batchId: item.batchId.trim(),
      allocatedQuantity: item.allocatedQuantity,
    }));

    const invalidItem = normalizedItems.find((item) => !item.batchId || item.allocatedQuantity < 1);
    if (invalidItem) {
      throw new BadRequestException('Offer batch allocations are invalid');
    }

    const uniqueBatchIds = [...new Set(normalizedItems.map((item) => item.batchId))];
    if (uniqueBatchIds.length !== normalizedItems.length) {
      throw new BadRequestException('Each batch can only be allocated once per request');
    }

    const existingAllocatedTotal = ownedOffer.batchLinks.reduce(
      (sum, item) => sum + item.allocatedQuantity,
      0,
    );
    const soldQuantity = Math.max(existingAllocatedTotal - ownedOffer.availableQuantity, 0);

    const batches = await this.productRepository.findAllocatableBatches(
      uniqueBatchIds,
      ownedOffer.shop.id,
      ownedOffer.productModelId,
    );

    if (batches.length !== uniqueBatchIds.length) {
      throw new BadRequestException('One or more batches do not belong to the same shop and product model as the offer');
    }

    const newAllocatedTotal = normalizedItems.reduce((sum, item) => sum + item.allocatedQuantity, 0);
    if (newAllocatedTotal < soldQuantity) {
      throw new BadRequestException('Allocated quantity cannot be lower than the quantity already sold');
    }

    const batchMap = new Map(batches.map((batch) => [batch.id, batch]));
    for (const item of normalizedItems) {
      const batch = batchMap.get(item.batchId);
      if (!batch) {
        throw new BadRequestException('Batch allocation is invalid');
      }

      const allocatedToOtherOffers = batch.offerLinks.reduce((sum, link) => {
        if (link.offerId === input.offerId) {
          return sum;
        }

        return sum + link.allocatedQuantity;
      }, 0);

      if (allocatedToOtherOffers + item.allocatedQuantity > batch.quantity) {
        throw new BadRequestException(`Batch ${batch.batchNumber} does not have enough allocatable quantity`);
      }
    }

    const links = await this.productRepository.replaceOfferBatchLinks({
      offerId: ownedOffer.id,
      soldQuantity,
      items: normalizedItems,
    });

    return links.map(toOfferBatchLinkResponse);
  }
}
