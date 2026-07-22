import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { OrderReversalService } from '../services';
import { toOrderResponse } from './orders.mapper';

@Injectable()
export class RefundOrderUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly orderReversalService: OrderReversalService,
  ) {}

  async execute(input: { id: string; requesterUserId: string; items?: Array<{ orderItemId: string; quantity: number }> }) {
    const order = await this.ordersRepository.findOrderById(input.id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.shop.ownerUserId !== input.requesterUserId) {
      throw new ForbiddenException('Only the seller can refund the order');
    }

    if (order.orderStatus !== 'paid') {
      throw new BadRequestException('Only paid orders can be refunded');
    }

    const updatedOrder = input.items?.length
      ? await this.orderReversalService.partialRefundPaidOrder(order.id, input.requesterUserId, input.items)
      : await this.orderReversalService.refundPaidOrder(order.id, input.requesterUserId);
    return toOrderResponse(updatedOrder);
  }
}
