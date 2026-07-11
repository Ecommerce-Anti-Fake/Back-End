import { BadRequestException, Injectable } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { toCartResponse } from './orders.mapper';

@Injectable()
export class UpdateCartItemUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(input: { buyerUserId: string; cartItemId: string; quantity: number }) {
    if (!Number.isInteger(input.quantity) || input.quantity < 1) {
      throw new BadRequestException('Quantity must be greater than zero');
    }

    const cartItem = await this.ordersRepository.findCartItemById(input.cartItemId);
    if (!cartItem || cartItem.cart.buyerUserId !== input.buyerUserId || cartItem.cart.cartStatus !== 'ACTIVE') {
      throw new BadRequestException('Cart item not found');
    }

    if (cartItem.variantId) {
      const variant = await this.ordersRepository.findOfferVariantForCart({
        offerId: cartItem.offerId,
        variantId: cartItem.variantId,
      });
      if (!variant || !variant.isActive || (variant.values ?? []).some(({ optionValue }) => !optionValue.isVisible)) {
        throw new BadRequestException('Variant is unavailable');
      }
      if (input.quantity > variant.availableQuantity) {
        throw new BadRequestException('Quantity exceeds available stock');
      }
    } else {
      const offer = await this.ordersRepository.findOfferForOrdering(cartItem.offerId);
      if (!offer || input.quantity > offer.availableQuantity) {
        throw new BadRequestException('Quantity exceeds available stock');
      }
    }

    const cart = await this.ordersRepository.updateCartItemQuantity(input);
    return toCartResponse(cart);
  }
}
