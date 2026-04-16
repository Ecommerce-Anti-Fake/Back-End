import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';

@Injectable()
export class OpenOrderDisputeUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(input: { id: string; requesterUserId: string; reason: string }) {
    const order = await this.ordersRepository.findOrderById(input.id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const isRetailBuyer = order.buyerUserId === input.requesterUserId;
    const isWholesaleBuyerOwner = order.buyerShop?.ownerUserId === input.requesterUserId;
    const isSellerOwner = order.shop.ownerUserId === input.requesterUserId;

    if (!isRetailBuyer && !isWholesaleBuyerOwner && !isSellerOwner) {
      throw new ForbiddenException('You do not have permission to open a dispute for this order');
    }

    if (!['paid', 'completed'].includes(order.orderStatus)) {
      throw new BadRequestException('Only paid or completed orders can be disputed');
    }

    const reason = input.reason.trim();
    if (!reason) {
      throw new BadRequestException('Dispute reason is required');
    }

    const existingOpenDispute = await this.ordersRepository.findOpenDisputeByOrder(order.id);
    if (existingOpenDispute) {
      throw new BadRequestException('Order already has an open dispute');
    }

    const dispute = await this.ordersRepository.createDispute({
      orderId: order.id,
      openedByUserId: input.requesterUserId,
      reason,
    });

    await this.ordersRepository.createAuditLog({
      targetType: 'DISPUTE',
      targetId: dispute.id,
      actorUserId: input.requesterUserId,
      action: 'DISPUTE_OPENED',
      toStatus: 'OPEN',
      note: reason,
      metadata: {
        orderId: order.id,
      },
    });

    return dispute;
  }
}
