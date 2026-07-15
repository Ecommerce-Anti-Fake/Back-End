import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OffersRepository } from '../../infrastructure/persistence/offers.repository';
import { toOfferResponse } from './offers.mapper';

@Injectable()
export class UpdateOfferUseCase {
  constructor(private readonly productRepository: OffersRepository) {}

  async execute(input: {
    offerId: string;
    sellerUserId: string;
    title?: string;
    description?: string;
    offerStatus?: 'active' | 'inactive' | 'draft';
    parcelWeightGrams?: number | null;
    parcelLengthCm?: number | null;
    parcelWidthCm?: number | null;
    parcelHeightCm?: number | null;
  }) {
    const offer = await this.productRepository.findOwnedOffer(
      input.offerId,
      input.sellerUserId,
    );
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    const data: {
      title?: string;
      description?: string;
      offerStatus?: string;
      parcelWeightGrams?: number | null;
      parcelLengthCm?: number | null;
      parcelWidthCm?: number | null;
      parcelHeightCm?: number | null;
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
        throw new BadRequestException(
          'Description must be at least 3 characters',
        );
      }
      data.description = description;
    }

    if (input.offerStatus !== undefined) {
      if (!['active', 'inactive', 'draft'].includes(input.offerStatus)) {
        throw new BadRequestException(
          'Offer status must be active, inactive, or draft',
        );
      }
      if (input.offerStatus === 'active' && offer.offerStatus === 'draft') {
        this.assertCanPublishDraft(offer);
      }
      data.offerStatus = input.offerStatus;
    }

    for (const key of [
      'parcelWeightGrams',
      'parcelLengthCm',
      'parcelWidthCm',
      'parcelHeightCm',
    ] as const) {
      if (input[key] !== undefined) {
        const value = input[key];
        if (value !== null && value < 1) {
          throw new BadRequestException('Parcel values must be greater than 0');
        }
        data[key] = value ?? null;
      }
    }

    if (Object.keys(data).length === 0) {
      return toOfferResponse(
        await this.productRepository.updateOwnedOffer(
          input.offerId,
          input.sellerUserId,
          {},
        ),
      );
    }

    const updatedOffer = await this.productRepository.updateOwnedOffer(
      input.offerId,
      input.sellerUserId,
      data,
    );
    return toOfferResponse(updatedOffer);
  }

  private assertCanPublishDraft(
    offer: {
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
    if (
      offer.shop.registrationType !== 'DISTRIBUTOR' ||
      !offer.distributionNodeId
    ) {
      return;
    }

    const availableQuantity = nextAvailableQuantity ?? 0;
    if (!Number.isInteger(availableQuantity) || availableQuantity < 1) {
      throw new BadRequestException(
        'Resale draft must have available stock before publishing',
      );
    }

    if (
      !offer.distributionNode ||
      offer.distributionNode.relationshipStatus !== 'ACTIVE' ||
      offer.distributionNode.shop.shopStatus !== 'verified'
    ) {
      throw new BadRequestException(
        'Resale draft distribution node must be active before publishing',
      );
    }

    const resaleBatchLinks = offer.batchLinks.filter(
      (link) =>
        link.batch?.sourceType === 'WHOLESALE_ORDER' &&
        link.batch.distributionNodeId === offer.distributionNodeId,
    );
    const allocatedQuantity = resaleBatchLinks.reduce(
      (sum, link) => sum + link.allocatedQuantity,
      0,
    );
    if (allocatedQuantity < availableQuantity) {
      throw new BadRequestException(
        'Resale draft must have enough attached batch stock before publishing',
      );
    }
  }
}
