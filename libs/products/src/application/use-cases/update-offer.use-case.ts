import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';
import { toOfferResponse } from './products.mapper';

@Injectable()
export class UpdateOfferUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(input: {
    offerId: string;
    sellerUserId: string;
    title?: string;
    description?: string;
    price?: number;
    availableQuantity?: number;
    offerStatus?: 'active' | 'inactive' | 'draft';
  }) {
    const offer = await this.productRepository.findOwnedOffer(input.offerId, input.sellerUserId);
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    const data: {
      title?: string;
      description?: string;
      price?: number;
      availableQuantity?: number;
      offerStatus?: string;
    } = {};

    if (input.title !== undefined) {
      const title = input.title.trim();
      if (title.length < 3) {
        throw new BadRequestException('Title must be at least 3 characters');
      }
      data.title = title;
    }

    if (input.description !== undefined) {
      const description = input.description.trim();
      if (description.length < 3) {
        throw new BadRequestException('Description must be at least 3 characters');
      }
      data.description = description;
    }

    if (input.price !== undefined) {
      if (input.price <= 0) {
        throw new BadRequestException('Price must be greater than 0');
      }
      data.price = input.price;
    }

    if (input.availableQuantity !== undefined) {
      if (input.availableQuantity < 0) {
        throw new BadRequestException('Available quantity cannot be negative');
      }
      data.availableQuantity = input.availableQuantity;
    }

    if (input.offerStatus !== undefined) {
      if (!['active', 'inactive', 'draft'].includes(input.offerStatus)) {
        throw new BadRequestException('Offer status must be active, inactive, or draft');
      }
      if (input.offerStatus === 'active' && offer.offerStatus === 'draft') {
        this.assertCanPublishDraft(offer, input.availableQuantity);
      }
      data.offerStatus = input.offerStatus;
    }

    if (Object.keys(data).length === 0) {
      return toOfferResponse(await this.productRepository.updateOwnedOffer(input.offerId, input.sellerUserId, {}));
    }

    const updatedOffer = await this.productRepository.updateOwnedOffer(input.offerId, input.sellerUserId, data);
    return toOfferResponse(updatedOffer);
  }

  private assertCanPublishDraft(
    offer: {
      salesMode: string;
      minWholesaleQty: number | null;
      availableQuantity: number;
      distributionNodeId: string | null;
      distributionNode: {
        relationshipStatus: string;
        shop: {
          shopStatus: string;
        };
      } | null;
      shop: {
        registrationType: string;
      };
      batchLinks: Array<{
        allocatedQuantity: number;
        batch?: {
          distributionNodeId: string | null;
          sourceType: string;
        };
      }>;
    },
    nextAvailableQuantity?: number,
  ) {
    if (offer.shop.registrationType !== 'DISTRIBUTOR' || !offer.distributionNodeId) {
      return;
    }

    if (!['WHOLESALE', 'BOTH'].includes(offer.salesMode)) {
      throw new BadRequestException('Resale draft must be a wholesale offer before publishing');
    }

    if (!offer.minWholesaleQty || offer.minWholesaleQty < 1) {
      throw new BadRequestException('Resale draft must define minimum wholesale quantity before publishing');
    }

    const availableQuantity = nextAvailableQuantity ?? offer.availableQuantity;
    if (!Number.isInteger(availableQuantity) || availableQuantity < 1) {
      throw new BadRequestException('Resale draft must have available stock before publishing');
    }

    if (
      !offer.distributionNode ||
      offer.distributionNode.relationshipStatus !== 'ACTIVE' ||
      offer.distributionNode.shop.shopStatus !== 'active'
    ) {
      throw new BadRequestException('Resale draft distribution node must be active before publishing');
    }

    const resaleBatchLinks = offer.batchLinks.filter(
      (link) =>
        link.batch?.sourceType === 'WHOLESALE_ORDER' &&
        link.batch.distributionNodeId === offer.distributionNodeId,
    );
    const allocatedQuantity = resaleBatchLinks.reduce((sum, link) => sum + link.allocatedQuantity, 0);
    if (allocatedQuantity < availableQuantity) {
      throw new BadRequestException('Resale draft must have enough attached batch stock before publishing');
    }
  }
}
