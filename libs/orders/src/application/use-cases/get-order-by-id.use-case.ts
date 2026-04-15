import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { toOrderResponse } from './orders.mapper';

@Injectable()
export class GetOrderByIdUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(id: string, requesterUserId: string) {
    const order = await this.ordersRepository.findOrderById(id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const isRetailBuyer = order.buyerUserId === requesterUserId;
    const isSellerOwner = order.shop.ownerUserId === requesterUserId;
    const isWholesaleBuyerOwner = order.buyerShop?.ownerUserId === requesterUserId;

    if (!isRetailBuyer && !isSellerOwner && !isWholesaleBuyerOwner) {
      throw new ForbiddenException('You do not have access to this order');
    }

    return toOrderResponse(order);
  }
}
