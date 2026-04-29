import { Injectable } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { toOrderResponse } from './orders.mapper';

@Injectable()
export class ListMyOrdersUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(requesterUserId: string) {
    const orders = await this.ordersRepository.findOrdersForUser(requesterUserId);
    return orders.map(toOrderResponse);
  }
}
