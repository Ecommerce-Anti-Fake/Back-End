import { Injectable, NotFoundException } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { CreateRetailOrderUseCase } from './create-retail-order.use-case';

@Injectable()
export class CheckoutCartItemUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly createRetailOrderUseCase: CreateRetailOrderUseCase,
  ) {}

  async execute(input: { buyerUserId: string; cartItemId: string; affiliateCode?: string | null }) {
    const cartItem = await this.ordersRepository.findCartItemById(input.cartItemId);
    if (!cartItem || cartItem.cart.buyerUserId !== input.buyerUserId || cartItem.cart.cartStatus !== 'ACTIVE') {
      throw new NotFoundException('Cart item not found');
    }

    const order = await this.createRetailOrderUseCase.execute({
      buyerUserId: input.buyerUserId,
      offerId: cartItem.offerId,
      quantity: cartItem.quantity,
      affiliateCode: input.affiliateCode ?? null,
    });

    await this.ordersRepository.removeCartItem({
      buyerUserId: input.buyerUserId,
      cartItemId: cartItem.id,
    });

    return order;
  }
}
