import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { toCartResponse } from './orders.mapper';

@Injectable()
export class AddCartItemUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(input: { buyerUserId: string; offerId: string; quantity: number }) {
    if (input.quantity < 1) {
      throw new BadRequestException('Quantity must be greater than zero');
    }

    const offer = await this.ordersRepository.findOfferForOrdering(input.offerId);
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (offer.salesMode === 'WHOLESALE') {
      throw new BadRequestException('This offer only supports wholesale orders');
    }

    if (input.quantity > offer.availableQuantity) {
      throw new BadRequestException('Quantity exceeds available stock');
    }

    const cart = await this.ordersRepository.upsertCartItem({
      buyerUserId: input.buyerUserId,
      offerId: offer.id,
      quantity: input.quantity,
      offerTitleSnapshot: offer.title,
      unitPriceSnapshot: Number(offer.price.toString()),
      currencySnapshot: offer.currency,
      shopNameSnapshot: offer.shop.shopName,
    });

    return toCartResponse(cart);
  }
}
