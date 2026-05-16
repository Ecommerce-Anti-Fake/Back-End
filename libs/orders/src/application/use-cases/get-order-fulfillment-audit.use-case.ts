import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';

@Injectable()
export class GetOrderFulfillmentAuditUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(id: string, requesterUserId: string, requesterRole?: string) {
    const order = await this.ordersRepository.findOrderById(id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const isAdmin = requesterRole === 'admin';
    const isRetailBuyer = order.buyerUserId === requesterUserId;
    const isSellerOwner = order.shop.ownerUserId === requesterUserId;
    const isWholesaleBuyerOwner = order.buyerShop?.ownerUserId === requesterUserId;
    const shouldSanitize = !isAdmin && !isSellerOwner && (isRetailBuyer || isWholesaleBuyerOwner);

    if (!isAdmin && !isRetailBuyer && !isSellerOwner && !isWholesaleBuyerOwner) {
      throw new ForbiddenException('You do not have access to this order');
    }

    const timeline = await this.ordersRepository.findAuditLogsByTarget('ORDER', id);

    return timeline
      .filter((log) => ['FULFILLMENT_STATUS_CHANGED', 'PAYMENT_STATUS_CHANGED'].includes(log.action))
      .map((log) => ({
        id: log.id,
        action: log.action,
        fromStatus: log.fromStatus,
        toStatus: log.toStatus,
        actorUserId: shouldSanitize ? null : log.actorUserId,
        actorDisplayName: log.actor.displayName,
        actorEmail: shouldSanitize ? null : log.actor.email,
        note: log.note,
        createdAt: log.createdAt,
      }));
  }
}
