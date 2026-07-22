import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { toOrderResponse } from './orders.mapper';
import { ReleaseEscrowUseCase } from './release-escrow.use-case';

@Injectable()
export class CompleteOrderUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly releaseEscrowUseCase: ReleaseEscrowUseCase,
  ) {}

  async execute(input: { id: string; requesterUserId: string }) {
    const order = await this.ordersRepository.findOrderById(input.id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const isSellerOwner =
      order.shopGroups?.some((group) => group.shop.ownerUserId === input.requesterUserId) ||
      order.shop.ownerUserId === input.requesterUserId;
    if (!isSellerOwner) {
      throw new ForbiddenException('Only the seller can complete the order');
    }

    if (!['paid', 'partially_refunded'].includes(order.orderStatus)) {
      throw new BadRequestException('Only paid or partially refunded orders can be completed');
    }

    if (order.fulfillmentStatus !== 'DELIVERED') {
      throw new BadRequestException('Only delivered orders can be completed');
    }

    if (order.disputes?.length) {
      throw new BadRequestException('Cannot complete order while an open dispute exists');
    }

    await this.releaseEscrowUseCase.execute({
      orderId: order.id,
      actorUserId: input.requesterUserId,
    });
    const updatedOrder = await this.ordersRepository.completeOrder({
      id: order.id,
      actorUserId: input.requesterUserId,
    });
    return toOrderResponse(updatedOrder);
  }
}
