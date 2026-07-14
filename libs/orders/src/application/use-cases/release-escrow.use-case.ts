import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, WalletBalanceType, WalletEntryDirection, WalletTransactionType } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';
import { WalletRepository } from '@wallet';

@Injectable()
export class ReleaseEscrowUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletRepository: WalletRepository,
  ) {}

  execute(input: { orderId: string; actorUserId: string }) {
    return this.prisma.$transaction(
      (tx) => this.executeInTransaction(tx, input),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async executeInTransaction(
    tx: Prisma.TransactionClient,
    input: { orderId: string; actorUserId: string },
  ) {
    const order = await tx.order.findUnique({
      where: { id: input.orderId },
      include: { escrow: true, shop: { select: { id: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.orderStatus !== 'paid') {
      throw new BadRequestException('Only paid orders can release escrow');
    }
    if (!order.escrow || order.escrow.escrowStatus !== 'HELD') {
      throw new BadRequestException('Escrow is not held');
    }

    const escrowWallet = await this.walletRepository.findOrCreatePlatformWalletInTransaction(
      tx,
      'PLATFORM_ESCROW_VND',
    );
    const revenueWallet = await this.walletRepository.findOrCreatePlatformWalletInTransaction(
      tx,
      'PLATFORM_REVENUE_VND',
    );
    const shopWallet = await this.walletRepository.findOrCreateShopWalletInTransaction(
      tx,
      order.shop.id,
    );

    await this.walletRepository.executeTransactionInTransaction(tx, {
      transactionCode: `ESCROW_RELEASE:${order.id}`,
      transactionType: WalletTransactionType.ESCROW_RELEASE,
      idempotencyKey: `ORDER:${order.id}:ESCROW_RELEASE`,
      amount: order.buyerPayableAmount,
      referenceType: 'ORDER',
      referenceId: order.id,
      orderId: order.id,
      description: `Release escrow for completed order ${order.id}`,
      entries: [
        {
          walletId: escrowWallet.id,
          direction: WalletEntryDirection.DEBIT,
          balanceType: WalletBalanceType.PENDING,
          amount: order.buyerPayableAmount,
        },
        {
          walletId: shopWallet.id,
          direction: WalletEntryDirection.CREDIT,
          balanceType: WalletBalanceType.PENDING,
          amount: order.sellerReceivableAmount,
        },
        {
          walletId: revenueWallet.id,
          direction: WalletEntryDirection.CREDIT,
          balanceType: WalletBalanceType.AVAILABLE,
          amount: order.platformFeeAmount,
        },
      ],
    });

    await tx.escrow.update({
      where: { id: order.escrow.id },
      data: { escrowStatus: 'RELEASED', releaseAt: new Date() },
    });

    return { orderId: order.id, escrowStatus: 'RELEASED' as const };
  }
}
