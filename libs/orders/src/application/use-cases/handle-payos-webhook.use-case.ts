import { BadRequestException, Injectable } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { PayOSPaymentService } from '../services';
import { CheckoutCartUseCase } from './checkout-cart.use-case';
import { toOrderResponse } from './orders.mapper';

@Injectable()
export class HandlePayOSWebhookUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly payOSPaymentService: PayOSPaymentService,
    private readonly checkoutCartUseCase: CheckoutCartUseCase,
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
      return this.handleCheckoutSessionWebhook(input, paymentLinkId);
    }

    const amount = Number(input.data.amount);
    const payableAmount = Number(order.buyerPayableAmount.toString());
    if (!Number.isFinite(amount) || amount !== Math.round(payableAmount)) {
      throw new BadRequestException('payOS webhook amount does not match order amount');
    }

    const dataCode = this.readString(input.data.code);
    if (!input.success || input.code !== '00' || dataCode !== '00') {
      if (order.paymentIntent?.paymentStatus === 'PAID' || order.paymentIntent?.paymentStatus === 'FAILED' || order.orderStatus !== 'pending') {
        return {
          received: true,
          order: toOrderResponse(order),
        };
      }

      const reference = this.readString(input.data.reference) || paymentLinkId;
      const reason = this.readString(input.desc) || this.readString(input.data.desc) || 'payOS payment failed';
      const updatedOrder = await this.ordersRepository.markOrderPaymentFailed({
        id: order.id,
        actorUserId: order.buyerUserId || order.buyerShop?.ownerUserId || order.shop.ownerUserId,
        providerRef: `PAYOS:${paymentLinkId}:${reference}`,
        reason,
      });

      return {
        received: true,
        order: toOrderResponse(updatedOrder),
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
      actorUserId: order.buyerUserId || order.buyerShop?.ownerUserId || order.shop.ownerUserId,
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

  private async handleCheckoutSessionWebhook(
    input: {
      code: string;
      desc: string;
      success: boolean;
      data: Record<string, unknown>;
    },
    paymentLinkId: string,
  ) {
    const paymentProviderRef = `PAYOS:${paymentLinkId}`;
    const session = await this.ordersRepository.findCheckoutSessionByPaymentProviderRef(paymentProviderRef);
    if (!session) {
      return {
        received: true,
        ignored: true,
        reason: 'order_not_found',
      };
    }

    const amount = Number(input.data.amount);
    const payableAmount = Number(session.amount.toString());
    if (!Number.isFinite(amount) || amount !== Math.round(payableAmount)) {
      throw new BadRequestException('payOS webhook amount does not match checkout session amount');
    }

    const dataCode = this.readString(input.data.code);
    if (!input.success || input.code !== '00' || dataCode !== '00') {
      if (session.paymentStatus !== 'PAID' && session.paymentStatus !== 'FAILED') {
        await this.ordersRepository.markCheckoutSessionFailed(session.id);
      }

      return {
        received: true,
        checkoutSessionId: session.id,
      };
    }

    const reference = this.readString(input.data.reference) || paymentLinkId;
    const orders = await this.checkoutCartUseCase.completePayOSSession({
      session,
      paymentProviderRef,
      reference,
    });

    return {
      received: true,
      checkoutSessionId: session.id,
      orders: orders.map((item) => toOrderResponse(item)),
    };
  }
}
