import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { toCartResponse } from './orders.mapper';

@Injectable()
export class AddCartItemUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(input: {
    buyerUserId: string;
    offerId: string;
    variantId?: string | null;
    sourceLiveSessionId?: string | null;
    quantity: number;
  }) {
    if (input.quantity < 1) {
      throw new BadRequestException('Quantity must be greater than zero');
    }

    const offer = await this.ordersRepository.findOfferForOrdering(input.offerId);
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    const hasVariants = offer.variants.length > 0;
    if (hasVariants && !input.variantId) {
      throw new BadRequestException('variantId is required for this offer');
    }

    const variant = input.variantId
      ? await this.ordersRepository.findOfferVariantForCart({
          offerId: offer.id,
          variantId: input.variantId,
        })
      : null;

    if (input.variantId && !variant) {
      throw new NotFoundException('Variant not found');
    }
    if (variant && !variant.isActive) {
      throw new BadRequestException('Variant is inactive');
    }

    if (!variant) {
      throw new BadRequestException('variantId is required for this offer');
    }
    if (variant.price === null) {
      throw new BadRequestException('Variant price is not configured');
    }
    const availableQuantity = variant.availableQuantity;
    if (input.quantity > availableQuantity) {
      throw new BadRequestException('Quantity exceeds available stock');
    }

    const sourceLiveSessionId = input.sourceLiveSessionId?.trim() || null;
    if (sourceLiveSessionId) {
      const featuredOffer =
        await this.ordersRepository.findLiveSessionOfferForAttribution({
          sessionId: sourceLiveSessionId,
          offerId: offer.id,
        });
      if (!featuredOffer || featuredOffer.session.status === 'CANCELLED') {
        throw new BadRequestException(
          'Live session source is invalid for this offer',
        );
      }
    }

    const cart = await this.ordersRepository.upsertCartItem({
      buyerUserId: input.buyerUserId,
      offerId: offer.id,
      variantId: variant?.id ?? null,
      quantity: input.quantity,
      availableQuantityLimit: availableQuantity,
      offerTitleSnapshot: offer.title,
      unitPriceSnapshot: Number(variant.price.toString()),
      currencySnapshot: offer.currency,
      shopNameSnapshot: offer.shop.shopName,
      sourceLiveSessionId,
    });

    return toCartResponse(cart);
  }
}
