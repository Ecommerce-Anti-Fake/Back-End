import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { toOrderResponse } from './orders.mapper';

@Injectable()
export class CancelOrderUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(input: { id: string; requesterUserId: string }) {
    const order = await this.ordersRepository.findOrderById(input.id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const isRetailBuyer = order.buyerUserId === input.requesterUserId;
    const isWholesaleBuyerOwner = order.buyerShop?.ownerUserId === input.requesterUserId;
    const isSellerOwner = order.shop.ownerUserId === input.requesterUserId;

    if (!isRetailBuyer && !isWholesaleBuyerOwner && !isSellerOwner) {
      throw new ForbiddenException('You do not have permission to cancel this order');
    }

    if (order.orderStatus !== 'pending') {
      throw new BadRequestException('Only pending orders can be cancelled');
    }

    const updatedOrder = await this.ordersRepository.cancelOrder(order.id);
    return toOrderResponse(updatedOrder);
  }
}
