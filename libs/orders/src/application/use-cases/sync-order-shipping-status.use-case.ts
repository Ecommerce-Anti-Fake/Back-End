import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { ShippingCarrierAdapterService } from '../services';
import { toOrderResponse } from './orders.mapper';

@Injectable()
export class SyncOrderShippingStatusUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly shippingCarrierAdapterService: ShippingCarrierAdapterService,
  ) {}

  async execute(input: { id: string; requesterUserId: string }) {
    const order = await this.ordersRepository.findOrderById(input.id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.shop.ownerUserId !== input.requesterUserId) {
      throw new ForbiddenException('Only the seller can sync shipping status');
    }

    if (!order.shippingTrackingCode) {
      throw new BadRequestException('Order does not have a tracking code');
    }

    const currentFulfillmentStatus = order.fulfillmentStatus || 'PENDING';
    if (currentFulfillmentStatus !== 'SHIPPING') {
      throw new BadRequestException('Order must be shipping before syncing carrier status');
    }

    const tracking = await this.trackShipmentWithFailureAudit({
      order,
      requesterUserId: input.requesterUserId,
      currentFulfillmentStatus,
    });
    const nextFulfillmentStatus = tracking.fulfillmentStatus;

    await this.ordersRepository.createAuditLog({
      targetType: 'ORDER',
      targetId: order.id,
      actorUserId: input.requesterUserId,
      action: 'SHIPPING_STATUS_SYNCED',
      fromStatus: currentFulfillmentStatus,
      toStatus: nextFulfillmentStatus,
      note: `Shipping carrier status synced as ${tracking.providerStatus}`,
      metadata: {
        domain: 'FULFILLMENT',
        shippingProviderCode: order.shippingProviderCode ?? null,
        shippingTrackingCode: order.shippingTrackingCode,
        providerStatus: tracking.providerStatus,
      },
    });

    if (nextFulfillmentStatus === currentFulfillmentStatus) {
      return toOrderResponse(order);
    }

    const updatedOrder = await this.ordersRepository.updateFulfillmentStatus(order.id, nextFulfillmentStatus);
    await this.createFulfillmentNotification(updatedOrder, nextFulfillmentStatus);
    return toOrderResponse(updatedOrder);
  }

  private createFulfillmentNotification(order: { id: string; buyerUserId: string | null }, toStatus: string) {
    if (!order.buyerUserId) {
      return null;
    }

    return this.ordersRepository.createNotification({
      userId: order.buyerUserId,
      notificationType: 'ORDER_FULFILLMENT',
      title: 'Cap nhat van chuyen',
      body: `Don hang ${order.id.slice(0, 8)} da cap nhat trang thai ${toStatus}.`,
      targetType: 'ORDER',
      targetId: order.id,
      dedupeKey: `ORDER_SHIPPING_SYNCED:${order.id}:${order.buyerUserId}:${toStatus}`,
    });
  }

  private async trackShipmentWithFailureAudit(input: {
    order: {
      id: string;
      shippingProviderCode: string | null;
      shippingTrackingCode: string | null;
    };
    requesterUserId: string;
    currentFulfillmentStatus: string;
  }) {
    try {
      return await this.shippingCarrierAdapterService.trackShipment({
        providerCode: input.order.shippingProviderCode,
        trackingCode: input.order.shippingTrackingCode ?? '',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Carrier tracking sync failed';
      await this.ordersRepository.createAuditLog({
        targetType: 'ORDER',
        targetId: input.order.id,
        actorUserId: input.requesterUserId,
        action: 'SHIPPING_STATUS_SYNC_FAILED',
        fromStatus: input.currentFulfillmentStatus,
        toStatus: input.currentFulfillmentStatus,
        note: message,
        metadata: {
          domain: 'FULFILLMENT',
          shippingProviderCode: input.order.shippingProviderCode ?? null,
          shippingTrackingCode: input.order.shippingTrackingCode,
          retryable: true,
          errorMessage: message,
        },
      });
      throw error;
    }
  }
}
