import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { OrderReversalService } from '../services';
import { toOrderResponse } from './orders.mapper';

const FULFILLMENT_STATUSES = ['PROCESSING', 'SHIPPING', 'DELIVERED', 'CANCELLED'] as const;
const FULFILLMENT_AUDIT_ACTION = 'FULFILLMENT_STATUS_CHANGED';

@Injectable()
export class UpdateOrderFulfillmentUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly orderReversalService: OrderReversalService,
  ) {}

  async execute(input: {
    id: string;
    requesterUserId: string;
    fulfillmentStatus: (typeof FULFILLMENT_STATUSES)[number];
  }) {
    const order = await this.ordersRepository.findOrderById(input.id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const shopGroup = order.shopGroups?.find((group) => group.shop.ownerUserId === input.requesterUserId);
    const isLegacySeller =
      (!order.shopGroups || order.shopGroups.length <= 1) && order.shop.ownerUserId === input.requesterUserId;
    if (!shopGroup && !isLegacySeller) {
      throw new ForbiddenException('Only the seller can update fulfillment');
    }

    if (['cancelled', 'refunded', 'completed'].includes(order.orderStatus)) {
      throw new BadRequestException('Cannot update fulfillment for closed orders');
    }

    const currentFulfillmentStatus = shopGroup?.fulfillmentStatus || order.fulfillmentStatus || 'PENDING';
    const isPaymentReady =
      order.orderStatus === 'paid' ||
      order.paymentIntent?.paymentStatus === 'PAID' ||
      order.paymentIntent?.paymentMethod === 'COD';

    if (input.fulfillmentStatus === 'PROCESSING') {
      if (currentFulfillmentStatus !== 'PENDING') {
        throw new BadRequestException('Order must be pending processing before it can be processed');
      }
      if (!isPaymentReady) {
        throw new BadRequestException('Only paid orders or COD orders can be processed');
      }
      const updatedOrder = shopGroup
        ? await this.ordersRepository.updateShopGroupFulfillmentStatus({
            orderId: order.id,
            groupId: shopGroup.id,
            fulfillmentStatus: 'PROCESSING',
          })
        : await this.ordersRepository.updateFulfillmentStatus(order.id, 'PROCESSING');
      await this.createFulfillmentAudit(
        order.id,
        input.requesterUserId,
        currentFulfillmentStatus,
        'PROCESSING',
        shopGroup?.id,
      );
      await this.createFulfillmentNotification(updatedOrder, 'PROCESSING', shopGroup?.id);
      return toOrderResponse(updatedOrder);
    }

    if (input.fulfillmentStatus === 'SHIPPING') {
      if (currentFulfillmentStatus !== 'PROCESSING') {
        throw new BadRequestException('Order must be processing before shipping');
      }
      const updatedOrder = shopGroup
        ? await this.ordersRepository.updateShopGroupFulfillmentStatus({
            orderId: order.id,
            groupId: shopGroup.id,
            fulfillmentStatus: 'SHIPPING',
          })
        : await this.ordersRepository.updateFulfillmentStatus(order.id, 'SHIPPING');
      await this.createFulfillmentAudit(
        order.id,
        input.requesterUserId,
        currentFulfillmentStatus,
        'SHIPPING',
        shopGroup?.id,
      );
      await this.createFulfillmentNotification(updatedOrder, 'SHIPPING', shopGroup?.id);
      return toOrderResponse(updatedOrder);
    }

    if (input.fulfillmentStatus === 'DELIVERED') {
      if (currentFulfillmentStatus !== 'SHIPPING') {
        throw new BadRequestException('Order must be shipping before it can be delivered');
      }

      const paymentMethod = order.paymentIntent?.paymentMethod;
      let paidOrder = order;

      if (order.orderStatus === 'pending' && paymentMethod === 'COD') {
        paidOrder = await this.ordersRepository.markOrderPaid({
          id: order.id,
          actorUserId: input.requesterUserId,
          providerRef: `COD-${order.id.slice(0, 8)}`,
        });
      }

      if (paidOrder.orderStatus !== 'paid') {
        throw new BadRequestException('Only paid orders can be delivered');
      }

      const updatedOrder = shopGroup
        ? await this.ordersRepository.updateShopGroupFulfillmentStatus({
            orderId: order.id,
            groupId: shopGroup.id,
            fulfillmentStatus: 'DELIVERED',
          })
        : await this.ordersRepository.updateFulfillmentStatus(order.id, 'DELIVERED');
      await this.createFulfillmentAudit(
        order.id,
        input.requesterUserId,
        currentFulfillmentStatus,
        'DELIVERED',
        shopGroup?.id,
      );
      await this.createFulfillmentNotification(updatedOrder, 'DELIVERED', shopGroup?.id);
      return toOrderResponse(updatedOrder);
    }

    if (input.fulfillmentStatus === 'CANCELLED') {
      if (shopGroup && order.shopGroups.length > 1) {
        if (currentFulfillmentStatus !== 'PENDING') {
          throw new BadRequestException('Only pending shop groups can be cancelled by fulfillment');
        }
        const cancelledOrder = await this.orderReversalService.cancelOrderShopGroup(order.id, shopGroup.id);
        await this.createFulfillmentAudit(
          order.id,
          input.requesterUserId,
          currentFulfillmentStatus,
          'CANCELLED',
          shopGroup.id,
        );
        await this.createFulfillmentNotification(cancelledOrder, 'CANCELLED', shopGroup.id);
        return toOrderResponse(cancelledOrder);
      }
      if (order.orderStatus !== 'pending') {
        throw new BadRequestException('Only pending orders can be cancelled by fulfillment');
      }
      const cancelledOrder = await this.orderReversalService.cancelOrder(order.id, input.requesterUserId);
      await this.createFulfillmentAudit(order.id, input.requesterUserId, currentFulfillmentStatus, 'CANCELLED');
      await this.createFulfillmentNotification(cancelledOrder, 'CANCELLED');
      return toOrderResponse(cancelledOrder);
    }
    throw new BadRequestException('Unsupported fulfillment status');
  }

  private createFulfillmentAudit(
    orderId: string,
    actorUserId: string,
    fromStatus: string,
    toStatus: string,
    orderShopGroupId?: string,
  ) {
    return this.ordersRepository.createAuditLog({
      targetType: 'ORDER',
      targetId: orderId,
      actorUserId,
      action: FULFILLMENT_AUDIT_ACTION,
      fromStatus,
      toStatus,
      note: `Fulfillment moved from ${fromStatus} to ${toStatus}`,
      metadata: {
        domain: 'FULFILLMENT',
        ...(orderShopGroupId ? { orderShopGroupId } : {}),
      },
    });
  }

  private createFulfillmentNotification(
    order: { id: string; buyerUserId: string | null },
    toStatus: string,
    orderShopGroupId?: string,
  ) {
    if (!order.buyerUserId) {
      return null;
    }

    return this.ordersRepository.createNotification({
      userId: order.buyerUserId,
      notificationType: 'ORDER_FULFILLMENT',
      title: 'Cap nhat don hang',
      body: `Don hang ${order.id.slice(0, 8)} da chuyen sang ${toStatus}.`,
      targetType: 'ORDER',
      targetId: order.id,
      dedupeKey: `ORDER_FULFILLMENT:${order.id}:${orderShopGroupId ? `${orderShopGroupId}:` : ''}${toStatus}:${order.buyerUserId}`,
    });
  }
}
