import { BadRequestException, Injectable } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { toCartResponse } from './orders.mapper';

@Injectable()
export class UpdateCartItemUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(input: { buyerUserId: string; cartItemId: string; quantity: number }) {
    if (input.quantity < 1) {
      throw new BadRequestException('Quantity must be greater than zero');
    }

    const cart = await this.ordersRepository.updateCartItemQuantity(input);
    return toCartResponse(cart);
  }
}
