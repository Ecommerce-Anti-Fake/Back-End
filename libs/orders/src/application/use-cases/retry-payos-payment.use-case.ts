import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { PayOSPaymentService } from '../services';
import { toOrderResponse } from './orders.mapper';

@Injectable()
export class RetryPayOSPaymentUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly payOSPaymentService: PayOSPaymentService,
  ) {}

  async execute(input: { id: string; requesterUserId: string }) {
    const order = await this.ordersRepository.findOrderById(input.id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.buyerUserId !== input.requesterUserId) {
      throw new ForbiddenException('Only the buyer can retry payOS payment');
    }

    if (order.orderStatus !== 'pending') {
      throw new BadRequestException('Only pending orders can retry payment');
    }

    if (order.paymentIntent?.paymentMethod !== 'PAYOS' || order.paymentIntent.paymentStatus !== 'FAILED') {
      throw new BadRequestException('Only failed payOS payments can be retried');
    }

    const firstItem = order.items[0];
    if (!firstItem) {
      throw new BadRequestException('Order has no payable items');
    }

    const paymentLink = await this.payOSPaymentService.createPaymentLink({
      orderId: order.id,
      amount: Number(order.buyerPayableAmount.toString()),
      description: `DH${order.id.replace(/-/g, '').slice(0, 7)}`,
      buyerName: order.shippingName,
      buyerPhone: order.shippingPhone,
      itemName: firstItem.offerTitleSnapshot,
      quantity: firstItem.quantity,
    });

    const updatedOrder = await this.ordersRepository.updatePaymentProviderRefAndStatus({
      orderId: order.id,
      actorUserId: input.requesterUserId,
      providerRef: `PAYOS:${paymentLink.paymentLinkId}`,
      paymentStatus: 'PENDING',
      note: 'Buyer retried payOS payment; waiting for provider confirmation',
    });

    return {
      ...toOrderResponse(updatedOrder),
      paymentProviderRef: `PAYOS:${paymentLink.paymentLinkId}`,
      payOSOrderCode: paymentLink.orderCode,
      payOSPaymentLinkId: paymentLink.paymentLinkId,
      payOSCheckoutUrl: paymentLink.checkoutUrl,
      payOSQrCode: paymentLink.qrCode ?? null,
    };
  }
}
