import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { toOrderResponse } from './orders.mapper';

@Injectable()
export class MarkOrderPaidUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(input: { id: string; requesterUserId: string; providerRef?: string | null }) {
    const order = await this.ordersRepository.findOrderById(input.id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const isRetailBuyer = order.buyerUserId === input.requesterUserId;
    const isWholesaleBuyerOwner = order.buyerShop?.ownerUserId === input.requesterUserId;
    if (!isRetailBuyer && !isWholesaleBuyerOwner) {
      throw new ForbiddenException('Only the buyer can mark the order as paid');
    }

    if (order.orderStatus !== 'pending') {
      throw new BadRequestException('Only pending orders can be marked as paid');
    }

    const updatedOrder = await this.ordersRepository.markOrderPaid({
      id: order.id,
      providerRef: input.providerRef?.trim() || null,
    });

    return toOrderResponse(updatedOrder);
  }
}
