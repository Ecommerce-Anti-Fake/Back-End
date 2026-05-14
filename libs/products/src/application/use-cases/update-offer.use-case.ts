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
    offerStatus?: 'active' | 'inactive';
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
      data.offerStatus = input.offerStatus;
    }

    if (Object.keys(data).length === 0) {
      return toOfferResponse(await this.productRepository.updateOwnedOffer(input.offerId, input.sellerUserId, {}));
    }

    const updatedOffer = await this.productRepository.updateOwnedOffer(input.offerId, input.sellerUserId, data);
    return toOfferResponse(updatedOffer);
  }
}
