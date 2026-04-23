import { Injectable } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { toCartResponse } from './orders.mapper';

@Injectable()
export class RemoveCartItemUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(input: { buyerUserId: string; cartItemId: string }) {
    const cart = await this.ordersRepository.removeCartItem(input);
    return toCartResponse(cart);
  }
}
