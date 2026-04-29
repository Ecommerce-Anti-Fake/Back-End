import { Injectable } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { toOrderResponse } from './orders.mapper';

@Injectable()
export class ListSellerShopOrdersUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(input: { requesterUserId: string; shopId: string }) {
    const orders = await this.ordersRepository.findOrdersForSellerShop(input);
    return orders.map(toOrderResponse);
  }
}
