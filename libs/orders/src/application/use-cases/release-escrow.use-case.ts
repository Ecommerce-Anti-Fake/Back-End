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
      include: {
        escrow: true,
        shop: { select: { id: true } },
        shopGroups: {
          select: {
            id: true,
            shopId: true,
            sellerReceivableAmount: true,
            refundAllocations: {
              where: { refund: { refundStatus: 'COMPLETED' } },
              select: { sellerReductionAmount: true },
            },
          },
        },
        affiliateConversion: {
          include: {
            program: { select: { ownerShopId: true, settlementMode: true, commissionHoldDays: true } },
            commissionEntries: {
              where: { commissionStatus: 'PENDING' },
              select: { amount: true },
            },
          },
        },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (!['paid', 'partially_refunded'].includes(order.orderStatus)) {
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
    const groups = order.shopGroups.length
      ? order.shopGroups.map((group) => ({
          shopId: group.shopId,
          sellerReceivableAmount: Prisma.Decimal.max(
            new Prisma.Decimal(0),
            new Prisma.Decimal(group.sellerReceivableAmount).minus(
              (group.refundAllocations ?? []).reduce(
                (sum, allocation) => sum.plus(allocation.sellerReductionAmount),
                new Prisma.Decimal(0),
              ),
            ),
          ),
        }))
      : [{ shopId: order.shop.id, sellerReceivableAmount: order.sellerReceivableAmount }];
    const automaticConversion =
      order.affiliateConversion?.conversionStatus === 'PENDING' &&
      order.affiliateConversion.program.settlementMode === 'AUTOMATIC'
      ? order.affiliateConversion
      : null;
    const commissionTotal = automaticConversion?.commissionEntries.reduce(
      (sum, entry) => sum.plus(entry.amount),
      new Prisma.Decimal(0),
    ) ?? new Prisma.Decimal(0);
    const fundingShopId = automaticConversion?.program.ownerShopId ?? null;

    if (automaticConversion && !fundingShopId) {
      throw new BadRequestException('Automatic affiliate program requires an owner shop');
    }

    const fundingGroup = fundingShopId
      ? groups.find((group) => group.shopId === fundingShopId)
      : null;
    if (automaticConversion && !fundingGroup) {
      throw new BadRequestException('Affiliate funding shop is not part of this order');
    }
    if (fundingGroup && commissionTotal.gt(fundingGroup.sellerReceivableAmount)) {
      throw new BadRequestException('Affiliate commission exceeds seller receivable amount');
    }

    const shopEntries: Array<{
      walletId: string;
      direction: WalletEntryDirection;
      balanceType: WalletBalanceType;
      amount: Prisma.Decimal;
    }> = [];
    let sellerCreditTotal = new Prisma.Decimal(0);
    for (const group of groups) {
      const shopWallet = await this.walletRepository.findOrCreateShopWalletInTransaction(tx, group.shopId);
      const reserved = group.shopId === fundingShopId ? commissionTotal : new Prisma.Decimal(0);
      const pendingAmount = new Prisma.Decimal(group.sellerReceivableAmount).minus(reserved);
      sellerCreditTotal = sellerCreditTotal.plus(group.sellerReceivableAmount);
      if (pendingAmount.gt(0)) {
        shopEntries.push({
          walletId: shopWallet.id,
          direction: WalletEntryDirection.CREDIT,
          balanceType: WalletBalanceType.PENDING,
          amount: pendingAmount,
        });
      }
      if (reserved.gt(0)) {
        shopEntries.push({
          walletId: shopWallet.id,
          direction: WalletEntryDirection.CREDIT,
          balanceType: WalletBalanceType.LOCKED,
          amount: reserved,
        });
      }
    }

    const releaseAmount = new Prisma.Decimal(order.escrow.heldAmount ?? order.buyerPayableAmount);
    if (releaseAmount.lte(0)) {
      throw new BadRequestException('Escrow has no remaining balance to release');
    }
    const platformRemainder = releaseAmount.minus(sellerCreditTotal);
    const platformEntries = platformRemainder.gt(0)
      ? [{
          walletId: revenueWallet.id,
          direction: WalletEntryDirection.CREDIT,
          balanceType: WalletBalanceType.AVAILABLE,
          amount: platformRemainder,
        }]
      : platformRemainder.lt(0)
        ? [{
            walletId: revenueWallet.id,
            direction: WalletEntryDirection.DEBIT,
            balanceType: WalletBalanceType.AVAILABLE,
            amount: platformRemainder.abs(),
          }]
        : [];
    const transactionAmount = releaseAmount.plus(
      platformRemainder.lt(0) ? platformRemainder.abs() : 0,
    );

    await this.walletRepository.executeTransactionInTransaction(tx, {
      transactionCode: `ESCROW_RELEASE:${order.id}`,
      transactionType: WalletTransactionType.ESCROW_RELEASE,
      idempotencyKey: `ORDER:${order.id}:ESCROW_RELEASE`,
      amount: transactionAmount,
      referenceType: 'ORDER',
      referenceId: order.id,
      orderId: order.id,
      description: `Release escrow for completed order ${order.id}`,
      entries: [
        {
          walletId: escrowWallet.id,
          direction: WalletEntryDirection.DEBIT,
          balanceType: WalletBalanceType.PENDING,
          amount: releaseAmount,
        },
        ...shopEntries,
        ...platformEntries,
      ],
    });

    const releaseAt = new Date();
    if (automaticConversion) {
      const availableAt = new Date(releaseAt);
      availableAt.setUTCDate(availableAt.getUTCDate() + automaticConversion.program.commissionHoldDays);
      await tx.affiliateConversion.update({
        where: { id: automaticConversion.id },
        data: { conversionStatus: 'APPROVED', approvedAt: releaseAt },
      });
      await tx.affiliateCommissionLedger.updateMany({
        where: { conversionId: automaticConversion.id, commissionStatus: 'PENDING' },
        data: { commissionStatus: 'LOCKED', lockedAt: releaseAt, availableAt },
      });
    }

    await tx.escrow.update({
      where: { id: order.escrow.id },
      data: { escrowStatus: 'RELEASED', releaseAt },
    });

    return { orderId: order.id, escrowStatus: 'RELEASED' as const };
  }
}
