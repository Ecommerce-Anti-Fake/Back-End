import { Injectable } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { toOrderResponse } from './orders.mapper';

@Injectable()
export class ListAdminOrdersUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(input?: {
    orderStatus?: string;
    paymentStatus?: string;
    search?: string;
    page?: number;
    pageSize?: number;
    sortOrder?: 'asc' | 'desc';
  }) {
    const result = await this.ordersRepository.findAdminOrders(input);

    return {
      ...result,
      items: result.items.map(toOrderResponse),
    };
  }
}
