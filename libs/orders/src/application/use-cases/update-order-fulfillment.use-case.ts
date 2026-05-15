import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { OrderReversalService } from '../services';
import { toOrderResponse } from './orders.mapper';

const FULFILLMENT_STATUSES = ['PROCESSING', 'SHIPPING', 'DELIVERED', 'CANCELLED'] as const;

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

    if (order.shop.ownerUserId !== input.requesterUserId) {
      throw new ForbiddenException('Only the seller can update fulfillment');
    }

    if (['cancelled', 'refunded', 'completed'].includes(order.orderStatus)) {
      throw new BadRequestException('Cannot update fulfillment for closed orders');
    }

    const currentFulfillmentStatus = order.fulfillmentStatus || 'PENDING';
    const isPaymentReady =
      order.orderStatus === 'paid' || order.paymentIntent?.paymentStatus === 'PAID' || order.paymentIntent?.paymentMethod === 'COD';

    if (input.fulfillmentStatus === 'PROCESSING') {
      if (currentFulfillmentStatus !== 'PENDING') {
        throw new BadRequestException('Order must be pending processing before it can be processed');
      }
      if (!isPaymentReady) {
        throw new BadRequestException('Only paid orders or COD orders can be processed');
      }
      return toOrderResponse(await this.ordersRepository.updateFulfillmentStatus(order.id, 'PROCESSING'));
    }

    if (input.fulfillmentStatus === 'SHIPPING') {
      if (currentFulfillmentStatus !== 'PROCESSING') {
        throw new BadRequestException('Order must be processing before shipping');
      }
      return toOrderResponse(await this.ordersRepository.updateFulfillmentStatus(order.id, 'SHIPPING'));
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
          providerRef: `COD-${order.id.slice(0, 8)}`,
        });
      }

      if (paidOrder.orderStatus !== 'paid') {
        throw new BadRequestException('Only paid orders can be delivered');
      }

      return toOrderResponse(await this.ordersRepository.updateFulfillmentStatus(order.id, 'DELIVERED'));
    }

    if (input.fulfillmentStatus === 'CANCELLED') {
      if (order.orderStatus !== 'pending') {
        throw new BadRequestException('Only pending orders can be cancelled by fulfillment');
      }
      return toOrderResponse(await this.orderReversalService.cancelOrder(order.id));
    }
    throw new BadRequestException('Unsupported fulfillment status');
  }
}
