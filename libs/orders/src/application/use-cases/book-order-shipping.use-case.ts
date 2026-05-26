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

    if (order.shop.ownerUserId !== input.requesterUserId) {
      throw new ForbiddenException('Only the seller can book shipping');
    }

    if (['cancelled', 'refunded', 'completed'].includes(order.orderStatus)) {
      throw new BadRequestException('Cannot book shipping for closed orders');
    }

    if ((order.fulfillmentStatus || 'PENDING') !== 'PROCESSING') {
      throw new BadRequestException('Order must be processing before booking shipping');
    }

    if (order.shippingTrackingCode) {
      return toOrderResponse(order);
    }

    const booking = await this.shippingCarrierAdapterService.bookShipment({
      orderId: order.id,
      providerCode: order.shippingProviderCode ?? 'SELF_DELIVERY',
      providerName: order.shippingProviderName ?? 'Seller tu giao',
      shippingName: order.shippingName,
      shippingPhone: order.shippingPhone,
      shippingAddress: order.shippingAddress,
      shippingDistrictId: order.shippingDistrictId,
      shippingWardCode: order.shippingWardCode,
      shippingServiceId: order.shippingServiceId,
      shippingServiceTypeId: order.shippingServiceTypeId,
      parcelWeightGrams: order.parcelWeightGrams,
      parcelLengthCm: order.parcelLengthCm,
      parcelWidthCm: order.parcelWidthCm,
      parcelHeightCm: order.parcelHeightCm,
    });

    const updatedOrder = await this.ordersRepository.bookOrderShipping({
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
