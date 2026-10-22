import { PayOSPaymentLifecycleService } from '../services/payos-payment-lifecycle.service';
import { PrismaService } from '@database/prisma/prisma.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { PayOSPaymentService } from '../services';
import { toOrderResponse } from './orders.mapper';

@Injectable()
export class RetryPayOSPaymentUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly payOSPaymentService: PayOSPaymentService,
    private readonly lifecycle: PayOSPaymentLifecycleService,
    private readonly prisma: PrismaService,
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

    if (
      order.paymentIntent?.paymentMethod !== 'PAYOS' ||
      !['FAILED', 'EXPIRED', 'CANCELLED'].includes(
        order.paymentIntent.paymentStatus,
      )
    ) {
      throw new BadRequestException(
        'Only failed payOS payments can be retried',
      );
    }

    // No stored provider reference means no checkout URL was exposed to the buyer.
    const previous = order.paymentIntent.providerRef
      ? await this.lifecycle.resume(input)
      : { status: 'FAILED' };
    if (previous.status === 'PAID')
      throw new BadRequestException('Order is already paid');
    if (previous.status === 'PENDING')
      throw new BadRequestException('Continue the existing payment instead');

    const firstItem = order.items[0];
    if (!firstItem) {
      throw new BadRequestException('Order has no payable items');
    }

    const paymentLink = await this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM "order" WHERE id = ${order.id} FOR UPDATE`;
        const lockedOrder = await tx.order.findUniqueOrThrow({
          where: { id: order.id },
          select: { orderStatus: true },
        });
        if (lockedOrder.orderStatus !== 'pending')
          throw new BadRequestException('Order is no longer pending');
        const current = await tx.paymentIntent.findUniqueOrThrow({
          where: { orderId: order.id },
        });
        if (!['FAILED', 'EXPIRED', 'CANCELLED'].includes(current.paymentStatus))
          throw new BadRequestException('Payment cannot be retried');
        const link = await this.payOSPaymentService.createPaymentLink({
          orderId: order.id,
          amount: Number(order.buyerPayableAmount.toString()),
          description: `DH${order.id.replace(/-/g, '').slice(0, 7)}`,
          buyerName: order.shippingName,
          buyerPhone: order.shippingPhone,
          itemName: firstItem.offerTitleSnapshot,
          quantity: firstItem.quantity,
        });

        await tx.orderPayOSPaymentAttempt.create({
          data: {
            orderId: order.id,
            paymentLinkId: link.paymentLinkId,
            orderCode: BigInt(link.orderCode),
            amount: current.amount,
            checkoutUrl: link.checkoutUrl,
            qrCode: link.qrCode,
            expiresAt: new Date(link.expiresAt),
          },
        });
        await tx.paymentIntent.update({
          where: { orderId: order.id },
          data: {
            providerRef: 'PAYOS:' + link.paymentLinkId,
            paymentStatus: 'PENDING',
          },
        });
        return link;
      },
      { timeout: 25000 },
    );
    const updatedOrder = await this.ordersRepository.findOrderById(order.id);
    if (!updatedOrder) throw new NotFoundException('Order not found');
    await this.prisma.auditLog.create({
      data: {
        targetType: 'ORDER',
        targetId: order.id,
        actorUserId: input.requesterUserId,
        action: 'PAYMENT_STATUS_CHANGED',
        fromStatus: previous.status,
        toStatus: 'PENDING',
        note: 'Buyer retried PayOS payment; awaiting provider confirmation',
      },
    });
    return {
      ...toOrderResponse(updatedOrder),
      paymentProviderRef: `PAYOS:${paymentLink.paymentLinkId}`,
      payOSOrderCode: paymentLink.orderCode,
      payOSPaymentLinkId: paymentLink.paymentLinkId,
      payOSCheckoutUrl: paymentLink.checkoutUrl,
      payOSQrCode: paymentLink.qrCode ?? null,
      expiresAt: paymentLink.expiresAt,
      serverTime: new Date().toISOString(),
      status: 'PENDING',
      checkoutUrl: paymentLink.checkoutUrl,
      paymentLinkId: paymentLink.paymentLinkId,
      qrCode: paymentLink.qrCode ?? null,
      orderId: order.id,
      amount: Number(order.buyerPayableAmount),
    };
  }
}
