import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '@database/prisma/prisma.service';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { PayOSPaymentService } from './payos-payment.service';
import { HandlePayOSWebhookUseCase } from '../use-cases/handle-payos-webhook.use-case';
import { CancelOrderUseCase } from '../use-cases/cancel-order.use-case';
import { OrderPayOSPaymentAttempt } from '@prisma/client';

@Injectable()
export class PayOSPaymentLifecycleService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PayOSPaymentLifecycleService.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersRepository,
    private readonly provider: PayOSPaymentService,
    private readonly webhook: HandlePayOSWebhookUseCase,
    private readonly cancellation: CancelOrderUseCase,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.reconcilePending(), 60000);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async resume(input: { id: string; requesterUserId: string }) {
    await this.ownedOrder(input);
    const attempt = await this.currentAttempt(input.id);
    const status = await this.reconcile(attempt);
    const current = await this.ownedOrder(input);
    return this.response(
      attempt,
      current.paymentIntent?.paymentStatus === 'PAID' ? 'PAID' : status,
      current.orderStatus === 'pending',
    );
  }

  async cancel(input: { id: string; requesterUserId: string }) {
    const order = await this.ownedOrder(input);
    const attempt = await this.currentAttempt(input.id);
    let status = await this.reconcile(attempt);
    if (status === 'PENDING') {
      const result = await this.provider.cancelPaymentLink(
        attempt.paymentLinkId,
      );
      status = await this.applyProvider(attempt, result);
    }
    if (order.paymentIntent?.paymentStatus === 'PAID') status = 'PAID';
    if (status === 'CANCELLED' && order.orderStatus !== 'cancelled') {
      try {
        await this.cancellation.execute(input);
      } catch (error) {
        const latest = await this.ownedOrder(input);
        if (latest.paymentIntent?.paymentStatus !== 'PAID') throw error;
        status = 'PAID';
      }
    }
    const current = await this.ownedOrder(input);
    return this.response(
      attempt,
      current.paymentIntent?.paymentStatus === 'PAID' ? 'PAID' : status,
      current.orderStatus === 'pending',
    );
  }

  async reconcilePending() {
    if (this.running) return;
    this.running = true;
    try {
      // Only managed attempts. Legacy records require a separate reviewed dry-run.
      const attempts = await this.prisma.orderPayOSPaymentAttempt.findMany({
        where: {
          status: { not: 'PAID' },
          OR: [
            { status: 'PENDING' },
            { createdAt: { gte: new Date(Date.now() - 7 * 86400000) } },
          ],
        },
        orderBy: [
          { lastCheckedAt: { sort: 'asc', nulls: 'first' } },
          { createdAt: 'asc' },
        ],
        take: 50,
      });
      for (const attempt of attempts) {
        try {
          await this.reconcile(attempt);
        } catch {
          await this.prisma.orderPayOSPaymentAttempt.updateMany({
            where: { paymentLinkId: attempt.paymentLinkId },
            data: { lastCheckedAt: new Date() },
          });
          this.logger.warn(
            'Order PayOS reconciliation deferred: ' + attempt.orderId,
          );
        }
      }
    } catch {
      this.logger.warn('Order PayOS reconciliation batch unavailable');
    } finally {
      this.running = false;
    }
  }

  async reconcile(attempt: OrderPayOSPaymentAttempt): Promise<string> {
    const provider = await this.provider.getPaymentLink(attempt.paymentLinkId);
    const domainOrder =
      provider.status === 'PENDING'
        ? await this.prisma.order.findUnique({
            where: { id: attempt.orderId },
            select: { orderStatus: true },
          })
        : null;
    if (
      provider.status === 'PENDING' &&
      domainOrder?.orderStatus === 'cancelled'
    ) {
      return this.applyProvider(
        attempt,
        await this.provider.cancelPaymentLink(attempt.paymentLinkId),
      );
    }
    if (
      provider.status === 'PENDING' &&
      attempt.expiresAt.getTime() <= Date.now()
    ) {
      const closed = await this.provider.cancelPaymentLink(
        attempt.paymentLinkId,
      );
      return this.applyProvider(attempt, closed, true);
    }
    return this.applyProvider(
      attempt,
      provider,
      attempt.expiresAt.getTime() <= Date.now(),
    );
  }

  private async applyProvider(
    attempt: OrderPayOSPaymentAttempt,
    provider: { status: string; amount: number; amountPaid: number },
    expired = false,
  ): Promise<string> {
    if (Number(attempt.amount) !== provider.amount)
      throw new BadRequestException('PayOS amount mismatch');
    if (provider.status === 'PAID') {
      if (provider.amountPaid !== Number(attempt.amount))
        throw new BadRequestException('PayOS paid amount mismatch');
      await this.webhook.settleVerifiedPayment(
        attempt.paymentLinkId,
        provider.amount,
      );
      return 'PAID';
    }
    const status = ['CANCELLED', 'EXPIRED', 'PAID'].includes(attempt.status)
      ? attempt.status
      : provider.status === 'CANCELLED' && expired
        ? 'EXPIRED'
        : ['CANCELLED', 'EXPIRED'].includes(provider.status)
          ? provider.status
          : 'PENDING';
    await this.prisma.orderPayOSPaymentAttempt.updateMany({
      where: { paymentLinkId: attempt.paymentLinkId, status: { not: 'PAID' } },
      data: { status, lastCheckedAt: new Date() },
    });
    if (status !== 'PENDING') {
      await this.prisma.paymentIntent.updateMany({
        where: {
          orderId: attempt.orderId,
          OR: [
            { providerRef: 'PAYOS:' + attempt.paymentLinkId },
            {
              providerRef: {
                startsWith: 'PAYOS:' + attempt.paymentLinkId + ':',
              },
            },
          ],
          paymentStatus: { not: 'PAID' },
        },
        data: { paymentStatus: status },
      });
    }
    const current = await this.prisma.orderPayOSPaymentAttempt.findFirst({
      where: { paymentLinkId: attempt.paymentLinkId },
    });
    return current?.status === 'PAID' ? 'PAID' : status;
  }

  private async ownedOrder(input: { id: string; requesterUserId: string }) {
    const order = await this.orders.findOrderById(input.id);
    if (!order) throw new NotFoundException('Order not found');
    if (
      order.buyerUserId !== input.requesterUserId &&
      order.buyerShop?.ownerUserId !== input.requesterUserId
    )
      throw new ForbiddenException('Only the buyer can manage this payment');
    if (order.paymentIntent?.paymentMethod !== 'PAYOS')
      throw new BadRequestException('Order does not use PayOS');
    return order;
  }
  private async currentAttempt(orderId: string) {
    const attempt = await this.prisma.orderPayOSPaymentAttempt.findFirst({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
    if (!attempt)
      throw new BadRequestException(
        'Legacy payment requires provider reconciliation; no resumable checkout is stored',
      );
    return attempt;
  }
  private response(
    attempt: OrderPayOSPaymentAttempt,
    status: string,
    payable: boolean,
  ) {
    const canResume =
      payable &&
      status === 'PENDING' &&
      attempt.expiresAt.getTime() > Date.now();
    return {
      orderId: attempt.orderId,
      paymentLinkId: attempt.paymentLinkId,
      orderCode: Number(attempt.orderCode),
      amount: Number(attempt.amount),
      status,
      canResume,
      canRetry: payable && (status === 'EXPIRED' || status === 'FAILED'),
      expiresAt: attempt.expiresAt.toISOString(),
      serverTime: new Date().toISOString(),
      checkoutUrl: canResume ? attempt.checkoutUrl : null,
      qrCode: canResume ? attempt.qrCode : null,
    };
  }
}
