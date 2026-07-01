import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { ShippingCarrierAdapterService } from '../services';
import { toOrderResponse } from './orders.mapper';

@Injectable()
export class BookOrderShippingUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly shippingCarrierAdapterService: ShippingCarrierAdapterService,
  ) {}

  async execute(input: { id: string; requesterUserId: string }) {
    const order = await this.ordersRepository.findOrderById(input.id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const shopGroup = order.shopGroups?.find((group) => group.shop.ownerUserId === input.requesterUserId);
    const isLegacySeller = order.shop.ownerUserId === input.requesterUserId;
    if (!shopGroup && !isLegacySeller) {
      throw new ForbiddenException('Only the seller can book shipping');
    }

    if (['cancelled', 'refunded', 'completed'].includes(order.orderStatus)) {
      throw new BadRequestException('Cannot book shipping for closed orders');
    }

    if ((shopGroup?.fulfillmentStatus || order.fulfillmentStatus || 'PENDING') !== 'PROCESSING') {
      throw new BadRequestException('Order must be processing before booking shipping');
    }

    if (shopGroup?.shippingTrackingCode || (!shopGroup && order.shippingTrackingCode)) {
      return toOrderResponse(order);
    }

    const booking = await this.shippingCarrierAdapterService.bookShipment({
      orderId: order.id,
      providerCode: shopGroup?.shippingProviderCode ?? order.shippingProviderCode ?? 'SELF_DELIVERY',
      providerName: shopGroup?.shippingProviderName ?? order.shippingProviderName ?? 'Seller tu giao',
      shippingName: shopGroup?.shippingName ?? order.shippingName,
      shippingPhone: shopGroup?.shippingPhone ?? order.shippingPhone,
      shippingAddress: shopGroup?.shippingAddress ?? order.shippingAddress,
      shippingDistrictId: shopGroup?.shippingDistrictId ?? order.shippingDistrictId,
      shippingWardCode: shopGroup?.shippingWardCode ?? order.shippingWardCode,
      shippingServiceId: shopGroup?.shippingServiceId ?? order.shippingServiceId,
      shippingServiceTypeId: shopGroup?.shippingServiceTypeId ?? order.shippingServiceTypeId,
      parcelWeightGrams: shopGroup?.parcelWeightGrams ?? order.parcelWeightGrams,
      parcelLengthCm: shopGroup?.parcelLengthCm ?? order.parcelLengthCm,
      parcelWidthCm: shopGroup?.parcelWidthCm ?? order.parcelWidthCm,
      parcelHeightCm: shopGroup?.parcelHeightCm ?? order.parcelHeightCm,
    });

    const updatedOrder = shopGroup
      ? await this.ordersRepository.bookOrderShopGroupShipping({
          orderId: order.id,
          groupId: shopGroup.id,
          actorUserId: input.requesterUserId,
          trackingCode: booking.trackingCode,
          providerStatus: booking.providerStatus,
        })
      : await this.ordersRepository.bookOrderShipping({
          id: order.id,
          actorUserId: input.requesterUserId,
          trackingCode: booking.trackingCode,
          providerStatus: booking.providerStatus,
        });

    await this.createShippingNotification(updatedOrder);
    return toOrderResponse(updatedOrder);
  }

  private createShippingNotification(order: { id: string; buyerUserId: string | null; shippingTrackingCode: string | null }) {
    if (!order.buyerUserId) {
      return null;
    }

    return this.ordersRepository.createNotification({
      userId: order.buyerUserId,
      notificationType: 'ORDER_FULFILLMENT',
      title: 'Don hang da tao van don',
      body: `Don hang ${order.id.slice(0, 8)} da co ma van don ${order.shippingTrackingCode ?? ''}.`,
      targetType: 'ORDER',
      targetId: order.id,
      dedupeKey: `ORDER_SHIPPING_BOOKED:${order.id}:${order.buyerUserId}:${order.shippingTrackingCode ?? ''}`,
    });
  }
}
