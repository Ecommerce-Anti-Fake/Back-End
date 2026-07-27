import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Prisma,
  WalletBalanceType,
  WalletEntryDirection,
  WalletTransactionType,
} from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';
import { WalletRepository } from '../../infrastructure/persistence/wallet.repository';

type SettlementClient = Prisma.TransactionClient;

@Injectable()
export class CodShopSettlementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletRepository: WalletRepository,
    private readonly configService: ConfigService,
  ) {}

  isEnabled() {
    return String(
      this.configService.get<string | boolean>('COD_SHOP_SETTLEMENT_ENABLED') ?? '',
    ).trim().toLowerCase() === 'true';
  }

  activate(input: { orderShopGroupId: string; actorUserId: string }) {
    if (!this.isEnabled()) return null;
    return this.prisma.$transaction(
      (tx) => this.activateInTransaction(tx, input.orderShopGroupId),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  prepare(input: { orderShopGroupId: string; actorUserId: string }) {
    if (!this.isEnabled()) return null;
    return this.prisma.$transaction(
      (tx) => this.prepareInTransaction(tx, input.orderShopGroupId),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async settleOutstandingForWalletInTransaction(
    tx: SettlementClient,
    walletId: string,
  ) {
    if (!this.isEnabled()) return;
    const settlements = await tx.codShopSettlement.findMany({
      where: { walletId, status: 'OUTSTANDING' },
      select: { orderShopGroupId: true },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'asc' }],
      take: 100,
    });
    for (const settlement of settlements) {
      const result = await this.activateInTransaction(tx, settlement.orderShopGroupId);
      if (result?.status === 'OUTSTANDING') {
        break;
      }
    }
  }

  async assertShopsCanReceiveOrdersInTransaction(
    tx: SettlementClient,
    shopIds: string[],
    now = new Date(),
  ) {
    if (!this.isEnabled() || !shopIds.length) return;
    const overdue = await tx.codShopSettlement.findFirst({
      where: {
        shopId: { in: [...new Set(shopIds)] },
        status: 'OUTSTANDING',
        dueAt: { lte: now },
      },
      select: {
        id: true,
        shopId: true,
        dueAt: true,
        shop: { select: { shopName: true } },
      },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'asc' }],
    });
    if (!overdue) return;
    throw new ConflictException({
      code: 'SHOP_COD_DEBT_OVERDUE',
      message: `${overdue.shop.shopName} đang tạm ngừng nhận đơn mới do nghĩa vụ COD quá hạn.`,
      shopId: overdue.shopId,
      dueAt: overdue.dueAt,
    });
  }

  async getShopSummary(shopId: string) {
    const items = await this.prisma.codShopSettlement.findMany({
      where: { shopId, status: 'OUTSTANDING' },
      select: { obligationAmount: true, settledAmount: true, dueAt: true },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'asc' }],
    });
    const amountDue = items.reduce(
      (total, item) => total.plus(item.obligationAmount.minus(item.settledAmount)),
      new Prisma.Decimal(0),
    );
    const now = new Date();
    return {
      codAmountDue: amountDue.toFixed(2),
      hasCodDebt: items.length > 0,
      hasOverdueCodDebt: items.some((item) => item.dueAt !== null && item.dueAt <= now),
      nextCodDebtDueAt: items[0]?.dueAt ?? null,
    };
  }

  async listShop(shopId: string) {
    const items = await this.prisma.codShopSettlement.findMany({
      where: { shopId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
    });
    return items.map((item) => this.toResponse(item));
  }

  private async prepareInTransaction(tx: SettlementClient, orderShopGroupId: string) {
    const context = await this.loadContext(tx, orderShopGroupId);
    if (context.paymentMethod !== 'COD') return null;
    const wallet = await this.walletRepository.findOrCreateShopWalletInTransaction(
      tx,
      context.shopId,
      'VND',
    );
    const existing = await tx.codShopSettlement.findUnique({
      where: { orderShopGroupId },
    });
    if (existing?.status === 'SETTLED' || existing?.status === 'REVERSED') {
      return this.toResponse(existing);
    }
    const settlement = await this.upsertPending(tx, context, wallet.id);
    const missing = Prisma.Decimal.max(
      new Prisma.Decimal(0),
      context.obligationAmount.minus(wallet.availableBalance),
    );
    if (missing.gt(0)) {
      await this.notify(tx, {
        userId: context.ownerUserId,
        dedupeKey: `COD_BALANCE_WARNING:${context.groupId}:${context.ownerUserId}`,
        title: 'Ví shop chưa đủ cho đơn COD',
        body: `Shop cần nạp thêm ${missing.toFixed(2)} VND để thanh toán phí hệ thống khi đơn giao thành công.`,
        shopId: context.shopId,
      });
    }
    return {
      ...this.toResponse(settlement),
      requiredTopUpAmount: missing.toFixed(2),
    };
  }

  private async activateInTransaction(
    tx: SettlementClient,
    orderShopGroupId: string,
  ) {
    const context = await this.loadContext(tx, orderShopGroupId);
    if (context.paymentMethod !== 'COD') return null;
    const wallet = await this.walletRepository.findOrCreateShopWalletInTransaction(
      tx,
      context.shopId,
      'VND',
    );
    const existing = await tx.codShopSettlement.findUnique({
      where: { orderShopGroupId },
    });
    if (existing?.status === 'SETTLED' || existing?.status === 'REVERSED') {
      return this.toResponse(existing);
    }
    const settlement = await this.upsertPending(tx, context, wallet.id);
    const missing = Prisma.Decimal.max(
      new Prisma.Decimal(0),
      context.obligationAmount.minus(wallet.availableBalance),
    );
    const now = new Date();
    if (missing.gt(0)) {
      const dueAt =
        existing?.dueAt ??
        new Date(now.getTime() + this.graceHours() * 60 * 60_000);
      const outstanding = await tx.codShopSettlement.update({
        where: { id: settlement.id },
        data: {
          status: 'OUTSTANDING',
          dueAt,
          settledAt: null,
          settledAmount: new Prisma.Decimal(0),
        },
      });
      await this.notify(tx, {
        userId: context.ownerUserId,
        dedupeKey: `COD_DEBT:${context.groupId}:${context.ownerUserId}`,
        title: 'Cần thanh toán nghĩa vụ COD',
        body: `Shop cần nạp thêm ${missing.toFixed(2)} VND trước ${dueAt.toISOString()} để tiếp tục nhận đơn mới.`,
        shopId: context.shopId,
      });
      return {
        ...this.toResponse(outstanding),
        obligationAmount: context.obligationAmount.toFixed(2),
        requiredTopUpAmount: missing.toFixed(2),
        dueAt,
      };
    }

    if (context.obligationAmount.gt(0)) {
      const revenueWallet =
        await this.walletRepository.findOrCreatePlatformWalletInTransaction(
          tx,
          'PLATFORM_REVENUE_VND',
          'VND',
        );
      await this.walletRepository.executeTransactionInTransaction(tx, {
        transactionCode: `COD_SETTLEMENT:${context.groupId}`,
        transactionType: WalletTransactionType.SETTLEMENT,
        idempotencyKey: `COD_SETTLEMENT:${context.groupId}:COLLECT`,
        amount: context.obligationAmount,
        referenceType: 'COD_SHOP_SETTLEMENT',
        referenceId: settlement.id,
        orderId: context.orderId,
        description: `Collect COD obligations for order shop group ${context.groupId}`,
        entries: [
          {
            walletId: wallet.id,
            direction: WalletEntryDirection.DEBIT,
            balanceType: WalletBalanceType.AVAILABLE,
            amount: context.obligationAmount,
          },
          ...(context.platformFeeAmount.gt(0)
            ? [{
                walletId: revenueWallet.id,
                direction: WalletEntryDirection.CREDIT,
                balanceType: WalletBalanceType.AVAILABLE,
                amount: context.platformFeeAmount,
              }]
            : []),
          ...(context.affiliateAmount.gt(0)
            ? [{
                walletId: wallet.id,
                direction: WalletEntryDirection.CREDIT,
                balanceType: WalletBalanceType.LOCKED,
                amount: context.affiliateAmount,
              }]
            : []),
        ],
      });
    }

    if (context.affiliateConversionId && context.affiliateAmount.gt(0)) {
      const availableAt = new Date(now);
      availableAt.setUTCDate(availableAt.getUTCDate() + context.affiliateHoldDays);
      await tx.affiliateConversion.update({
        where: { id: context.affiliateConversionId },
        data: { conversionStatus: 'APPROVED', approvedAt: now },
      });
      await tx.affiliateCommissionLedger.updateMany({
        where: {
          conversionId: context.affiliateConversionId,
          commissionStatus: 'PENDING',
        },
        data: {
          commissionStatus: 'LOCKED',
          lockedAt: now,
          availableAt,
        },
      });
    }

    const settled = await tx.codShopSettlement.update({
      where: { id: settlement.id },
      data: {
        status: 'SETTLED',
        settledAmount: context.obligationAmount,
        settledAt: now,
        dueAt: existing?.dueAt ?? null,
      },
    });
    await this.notify(tx, {
      userId: context.ownerUserId,
      dedupeKey: `COD_SETTLED:${context.groupId}:${context.ownerUserId}`,
      title: 'Đã thanh toán nghĩa vụ COD',
      body: `Hệ thống đã tự động trừ ${context.obligationAmount.toFixed(2)} VND từ ví shop.`,
      shopId: context.shopId,
    });
    return {
      ...this.toResponse(settled),
      status: 'SETTLED',
      obligationAmount: context.obligationAmount.toFixed(2),
      requiredTopUpAmount: '0.00',
    };
  }

  private async upsertPending(
    tx: SettlementClient,
    context: Awaited<ReturnType<CodShopSettlementService['loadContext']>>,
    walletId: string,
  ) {
    return tx.codShopSettlement.upsert({
      where: { orderShopGroupId: context.groupId },
      create: {
        orderId: context.orderId,
        orderShopGroupId: context.groupId,
        shopId: context.shopId,
        walletId,
        platformFeeAmount: context.platformFeeAmount,
        affiliateAmount: context.affiliateAmount,
        obligationAmount: context.obligationAmount,
        status: 'PENDING',
      },
      update: {
        walletId,
        platformFeeAmount: context.platformFeeAmount,
        affiliateAmount: context.affiliateAmount,
        obligationAmount: context.obligationAmount,
      },
    });
  }

  private async loadContext(tx: SettlementClient, orderShopGroupId: string) {
    const group = await tx.orderShopGroup.findUnique({
      where: { id: orderShopGroupId },
      include: {
        shop: { select: { ownerUserId: true, shopName: true } },
        refundAllocations: {
          where: { refund: { refundStatus: 'COMPLETED' } },
          select: { platformFeeReductionAmount: true },
        },
        order: {
          select: {
            paymentIntent: { select: { paymentMethod: true } },
            affiliateConversion: {
              include: {
                program: {
                  select: {
                    ownerShopId: true,
                    settlementMode: true,
                    commissionHoldDays: true,
                  },
                },
                commissionEntries: {
                  where: { commissionStatus: 'PENDING' },
                  select: { amount: true },
                },
              },
            },
          },
        },
      },
    });
    if (!group) throw new NotFoundException('Order shop group not found');
    const platformFeeReduction = group.refundAllocations.reduce(
      (total, item) => total.plus(item.platformFeeReductionAmount),
      new Prisma.Decimal(0),
    );
    const platformFeeAmount = Prisma.Decimal.max(
      new Prisma.Decimal(0),
      group.platformFeeAmount.minus(platformFeeReduction),
    );
    const conversion = group.order.affiliateConversion;
    const automaticAffiliate =
      conversion?.conversionStatus === 'PENDING' &&
      conversion.program.ownerShopId === group.shopId &&
      conversion.program.settlementMode === 'AUTOMATIC'
        ? conversion
        : null;
    const affiliateAmount = automaticAffiliate?.commissionEntries.reduce(
      (total, item) => total.plus(item.amount),
      new Prisma.Decimal(0),
    ) ?? new Prisma.Decimal(0);
    return {
      groupId: group.id,
      orderId: group.orderId,
      shopId: group.shopId,
      ownerUserId: group.shop.ownerUserId,
      paymentMethod: group.order.paymentIntent?.paymentMethod ?? null,
      platformFeeAmount,
      affiliateAmount,
      obligationAmount: platformFeeAmount.plus(affiliateAmount),
      affiliateConversionId: automaticAffiliate?.id ?? null,
      affiliateHoldDays: automaticAffiliate?.program.commissionHoldDays ?? 0,
    };
  }

  private notify(
    tx: SettlementClient,
    input: {
      userId: string;
      dedupeKey: string;
      title: string;
      body: string;
      shopId: string;
    },
  ) {
    return tx.notification.upsert({
      where: { dedupeKey: input.dedupeKey },
      update: {},
      create: {
        userId: input.userId,
        notificationType: 'WALLET_COD_SETTLEMENT',
        title: input.title,
        body: input.body,
        targetType: 'SHOP_WALLET',
        targetId: input.shopId,
        dedupeKey: input.dedupeKey,
      },
    });
  }

  private graceHours() {
    const configured = Number(this.configService.get<string>('COD_DEBT_GRACE_HOURS') ?? 72);
    return Number.isFinite(configured)
      ? Math.min(720, Math.max(1, Math.trunc(configured)))
      : 72;
  }

  private toResponse(item: {
    id: string;
    orderId?: string;
    orderShopGroupId?: string;
    platformFeeAmount?: Prisma.Decimal;
    affiliateAmount?: Prisma.Decimal;
    obligationAmount?: Prisma.Decimal;
    settledAmount?: Prisma.Decimal;
    status: string;
    dueAt?: Date | null;
    settledAt?: Date | null;
    createdAt?: Date;
  }) {
    return {
      id: item.id,
      orderId: item.orderId,
      orderShopGroupId: item.orderShopGroupId,
      platformFeeAmount: item.platformFeeAmount?.toFixed(2),
      affiliateAmount: item.affiliateAmount?.toFixed(2),
      obligationAmount: item.obligationAmount?.toFixed(2),
      settledAmount: item.settledAmount?.toFixed(2),
      status: item.status,
      dueAt: item.dueAt ?? null,
      settledAt: item.settledAt ?? null,
      createdAt: item.createdAt,
    };
  }
}
