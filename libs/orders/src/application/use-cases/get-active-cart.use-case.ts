import { Injectable } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { toCartResponse } from './orders.mapper';

@Injectable()
export class GetActiveCartUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(buyerUserId: string) {
    const cart = await this.ordersRepository.getOrCreateActiveCart(buyerUserId);
    return toCartResponse(cart);
  }
}
