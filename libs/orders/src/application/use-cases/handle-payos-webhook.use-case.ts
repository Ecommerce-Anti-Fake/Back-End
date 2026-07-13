import { BadRequestException, Injectable } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { PayOSPaymentService } from '../services';
import { Prisma, WalletBalanceType, WalletEntryDirection, WalletTransactionType } from '@prisma/client';
import { WalletRepository } from '@wallet';
import { PrismaService } from '@database/prisma/prisma.service';

@Injectable()
export class HandlePayOSWebhookUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly payOSPaymentService: PayOSPaymentService,
    private readonly prisma: PrismaService,
    private readonly walletRepository: WalletRepository,
  ) {}

  async execute(input: { code: string; desc: string; success: boolean; signature: string; data: Record<string, unknown> }) {
    if (
      !this.payOSPaymentService.verifyWebhook({
        data: input.data,
        signature: input.signature,
      })
    ) {
      throw new BadRequestException('Invalid payOS webhook signature');
    }

    const paymentLinkId = this.readString(input.data.paymentLinkId);
    if (!paymentLinkId) throw new BadRequestException('Missing payOS paymentLinkId');
    const order = await this.ordersRepository.findOrderByPaymentProviderRef(`PAYOS:${paymentLinkId}`);
    if (!order) return { received: true, ignored: true, reason: 'order_not_found' };

    const amount = Number(input.data.amount);
    const payableAmount = Number(order.buyerPayableAmount.toString());
    if (!Number.isFinite(amount) || amount !== Math.round(payableAmount)) {
      throw new BadRequestException('payOS webhook amount does not match order amount');
    }

    const dataCode = this.readString(input.data.code);
    if (!input.success || input.code !== '00' || dataCode !== '00') {
      if (
        order.paymentIntent?.paymentStatus === 'PAID' ||
        order.paymentIntent?.paymentStatus === 'FAILED' ||
        order.orderStatus !== 'pending'
      ) {
        return { received: true };
      }
      const reference = this.readString(input.data.reference) || paymentLinkId;
      const reason = this.readString(input.desc) || this.readString(input.data.desc) || 'payOS payment failed';
      await this.ordersRepository.markOrderPaymentFailed({
        id: order.id,
        actorUserId: order.buyerUserId || order.buyerShop?.ownerUserId || order.shop.ownerUserId,
        providerRef: `PAYOS:${paymentLinkId}:${reference}`,
        reason,
      });
      return { received: true };
    }

    if (order.paymentIntent?.paymentStatus === 'PAID' || order.orderStatus !== 'pending') {
      return { received: true };
    }
    const reference = this.readString(input.data.reference) || paymentLinkId;
    const providerRef = `PAYOS:${paymentLinkId}:${reference}`;
    await this.prisma.$transaction(async (tx) => {
      const idempotencyKey = `ORDER:${order.id}:PAYOS_ESCROW_HOLD:${paymentLinkId}`;
      const existingWalletTransaction = await tx.walletTransaction.findUnique({
        where: { idempotencyKey },
      });
      if (existingWalletTransaction) {
        return this.ordersRepository.markOrderPaidInTransaction(tx, {
          id: order.id,
          actorUserId: order.buyerUserId || order.buyerShop?.ownerUserId || order.shop.ownerUserId,
          providerRef,
        });
      }
      const clearingWallet = await this.walletRepository.findOrCreatePlatformWalletInTransaction(
        tx,
        'PLATFORM_PAYMENT_CLEARING_VND',
      );
      const escrowWallet = await this.walletRepository.findOrCreatePlatformWalletInTransaction(
        tx,
        'PLATFORM_ESCROW_VND',
      );

      await tx.wallet.update({
        where: { id: clearingWallet.id },
        data: {
          availableBalance: { increment: order.buyerPayableAmount },
          version: { increment: 1 },
        },
      });
      await this.walletRepository.executeTransactionInTransaction(tx, {
        transactionCode: `ESCROW_HOLD:${order.id}`,
        transactionType: WalletTransactionType.ESCROW_HOLD,
        idempotencyKey,
        amount: order.buyerPayableAmount,
        referenceType: 'PAYOS_PAYMENT',
        referenceId: providerRef,
        orderId: order.id,
        paymentIntentId: order.paymentIntent?.id ?? null,
        description: `PayOS escrow hold for order ${order.id}`,
        entries: [
          {
            walletId: clearingWallet.id,
            direction: WalletEntryDirection.DEBIT,
            balanceType: WalletBalanceType.AVAILABLE,
            amount: order.buyerPayableAmount,
          },
          {
            walletId: escrowWallet.id,
            direction: WalletEntryDirection.CREDIT,
            balanceType: WalletBalanceType.PENDING,
            amount: order.buyerPayableAmount,
          },
        ],
      });
      return this.ordersRepository.markOrderPaidInTransaction(tx, {
        id: order.id,
        actorUserId: order.buyerUserId || order.buyerShop?.ownerUserId || order.shop.ownerUserId,
        providerRef,
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return { received: true };
  }

  private readString(value: unknown) {
    return typeof value === 'string' ? value.trim() : '';
  }
}
