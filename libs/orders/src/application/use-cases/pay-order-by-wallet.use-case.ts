import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, WalletBalanceType, WalletEntryDirection, WalletTransactionType } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';
import { WalletRepository } from '@wallet';

@Injectable()
export class PayOrderByWalletUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletRepository: WalletRepository,
  ) {}

  async execute(input: { orderId: string; requesterUserId: string; amount: Prisma.Decimal | number }) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: input.orderId },
        include: { paymentIntent: true, escrow: true },
      });
      if (!order) throw new NotFoundException('Order not found');
      if (order.buyerUserId !== input.requesterUserId) {
        throw new ForbiddenException('Only the buyer can pay this order');
      }
      const amount = new Prisma.Decimal(input.amount);
      if (!amount.equals(order.buyerPayableAmount)) {
        throw new BadRequestException('Payment amount does not match order amount');
      }
      if (order.paymentIntent?.paymentStatus === 'PAID' && order.paymentIntent.paymentMethod === 'WALLET') {
        return order;
      }
      if (order.orderStatus !== 'pending' || order.paymentIntent?.paymentStatus === 'PAID') {
        throw new BadRequestException('Order has already been paid or is not payable');
      }
      if (!order.paymentIntent || !order.escrow) {
        throw new BadRequestException('Order payment foundation is incomplete');
      }

      const userWallet = await this.walletRepository.findOrCreateUserWalletInTransaction(
        tx,
        input.requesterUserId,
      );
      const escrowWallet = await this.walletRepository.findOrCreatePlatformWalletInTransaction(
        tx,
        'PLATFORM_ESCROW_VND',
      );

      await this.walletRepository.executeTransactionInTransaction(tx, {
        transactionCode: `ESCROW_HOLD:${order.id}`,
        transactionType: WalletTransactionType.ESCROW_HOLD,
        idempotencyKey: `ORDER:${order.id}:WALLET_PAYMENT`,
        amount,
        referenceType: 'ORDER',
        referenceId: order.id,
        orderId: order.id,
        paymentIntentId: order.paymentIntent.id,
        description: `Wallet escrow hold for order ${order.id}`,
        entries: [
          {
            walletId: userWallet.id,
            direction: WalletEntryDirection.DEBIT,
            balanceType: WalletBalanceType.AVAILABLE,
            amount,
          },
          {
            walletId: escrowWallet.id,
            direction: WalletEntryDirection.CREDIT,
            balanceType: WalletBalanceType.PENDING,
            amount,
          },
        ],
      });

      const now = new Date();
      await tx.paymentIntent.update({
        where: { id: order.paymentIntent.id },
        data: { paymentMethod: 'WALLET', paymentStatus: 'PAID' },
      });
      await tx.escrow.update({
        where: { id: order.escrow.id },
        data: { escrowStatus: 'HELD', heldAmount: amount, holdAt: now },
      });
      return tx.order.update({
        where: { id: order.id },
        data: { orderStatus: 'paid', fulfillmentStatus: 'PENDING' },
        include: { paymentIntent: true, escrow: true },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
