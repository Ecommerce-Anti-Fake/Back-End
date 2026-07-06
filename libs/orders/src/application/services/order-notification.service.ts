import { Injectable } from '@nestjs/common';
import { OrdersRepository, OrderWithRelations } from '../../infrastructure/persistence/orders.repository';

@Injectable()
export class OrderNotificationService {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  notifyCreated(order: OrderWithRelations) {
    return this.notifyParticipants(order, 'ORDER_CREATED', 'Don hang moi', (recipientId) =>
      recipientId === order.buyerUserId
        ? `Don hang ${order.id.slice(0, 8)} da duoc tao thanh cong.`
        : `Shop cua ban vua nhan don hang ${order.id.slice(0, 8)}.`,
    );
  }

  notifyCancelled(order: OrderWithRelations, actorUserId: string) {
    return this.notifyParticipants(
      order,
      'ORDER_CANCELLED',
      'Don hang da huy',
      () => `Don hang ${order.id.slice(0, 8)} da bi huy.`,
      actorUserId,
    );
  }

  private async notifyParticipants(
    order: OrderWithRelations,
    notificationType: 'ORDER_CREATED' | 'ORDER_CANCELLED',
    title: string,
    body: (recipientId: string) => string,
    excludedUserId?: string,
  ) {
    const recipientIds = new Set<string>();
    if (order.buyerUserId) recipientIds.add(order.buyerUserId);
    if (order.shop?.ownerUserId) recipientIds.add(order.shop.ownerUserId);
    for (const group of order.shopGroups ?? []) {
      if (group.shop.ownerUserId) recipientIds.add(group.shop.ownerUserId);
    }
    if (excludedUserId) recipientIds.delete(excludedUserId);

    await Promise.all(
      [...recipientIds].map((userId) =>
        this.ordersRepository.createNotification({
          userId,
          notificationType,
          title,
          body: body(userId),
          targetType: 'ORDER',
          targetId: order.id,
          dedupeKey: `${notificationType}:${order.id}:${userId}`,
        }),
      ),
    );
  }
}
