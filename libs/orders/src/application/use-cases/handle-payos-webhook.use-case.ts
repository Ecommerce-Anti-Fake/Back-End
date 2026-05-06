import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { PayOSPaymentService } from '../services';
import { toOrderResponse } from './orders.mapper';

@Injectable()
export class HandlePayOSWebhookUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly payOSPaymentService: PayOSPaymentService,
  ) {}

  async execute(input: {
    code: string;
    desc: string;
    success: boolean;
    signature: string;
    data: Record<string, unknown>;
  }) {
    if (!this.payOSPaymentService.verifyWebhook({ data: input.data, signature: input.signature })) {
      throw new BadRequestException('Invalid payOS webhook signature');
    }

    const paymentLinkId = this.readString(input.data.paymentLinkId);
    if (!paymentLinkId) {
      throw new BadRequestException('Missing payOS paymentLinkId');
    }

    const order = await this.ordersRepository.findOrderByPaymentProviderRef(`PAYOS:${paymentLinkId}`);
    if (!order) {
      throw new NotFoundException('Order not found for payOS payment link');
    }

    const amount = Number(input.data.amount);
    const payableAmount = Number(order.buyerPayableAmount.toString());
    if (!Number.isFinite(amount) || amount !== Math.round(payableAmount)) {
      throw new BadRequestException('payOS webhook amount does not match order amount');
    }

    const dataCode = this.readString(input.data.code);
    if (!input.success || input.code !== '00' || dataCode !== '00') {
      return {
        received: true,
        order: toOrderResponse(order),
      };
    }

    if (order.paymentIntent?.paymentStatus === 'PAID' || order.orderStatus !== 'pending') {
      return {
        received: true,
        order: toOrderResponse(order),
      };
    }

    const reference = this.readString(input.data.reference) || paymentLinkId;
    const updatedOrder = await this.ordersRepository.markOrderPaid({
      id: order.id,
      providerRef: `PAYOS:${paymentLinkId}:${reference}`,
    });

    return {
      received: true,
      order: toOrderResponse(updatedOrder),
    };
  }

  private readString(value: unknown) {
    return typeof value === 'string' ? value.trim() : '';
  }
}
