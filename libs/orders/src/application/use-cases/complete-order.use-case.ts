import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { toOrderResponse } from './orders.mapper';

@Injectable()
export class CompleteOrderUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(input: { id: string; requesterUserId: string }) {
    const order = await this.ordersRepository.findOrderById(input.id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.shop.ownerUserId !== input.requesterUserId) {
      throw new ForbiddenException('Only the seller can complete the order');
    }

    if (order.orderStatus !== 'paid') {
      throw new BadRequestException('Only paid orders can be completed');
    }

    const updatedOrder = await this.ordersRepository.completeOrder(order.id);
    return toOrderResponse(updatedOrder);
  }
}
