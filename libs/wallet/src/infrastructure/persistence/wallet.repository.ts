import { ConflictException, Injectable } from '@nestjs/common';
import {
  Prisma,
  WalletBalanceType,
  WalletEntryDirection,
  WalletOwnerType,
  WalletStatus,
} from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';
import {
  assertBalancedLedger,
  WALLET_ERROR_CODES,
  WalletDomainError,
} from '../../domain';
import {
  WalletLedgerPage,
  WalletRepositoryPort,
  WalletTransactionInput,
} from '../../application/ports';

type WalletClient = Prisma.TransactionClient;

@Injectable()
export class WalletRepository extends WalletRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  findById(walletId: string) {
    return this.prisma.wallet.findUnique({ where: { id: walletId } });
  }

  async findOrCreateUserWallet(userId: string, currency = 'VND') {
    return this.findOrCreateWallet({
      ownerType: WalletOwnerType.USER,
      userId,
      currency,
    });
  }

  async findOrCreateShopWallet(shopId: string, currency = 'VND') {
    return this.findOrCreateWallet({
      ownerType: WalletOwnerType.SHOP,
      shopId,
      currency,
    });
  }

  async findOrCreatePlatformWallet(platformCode: string, currency = 'VND') {
    return this.findOrCreateWallet({
      ownerType: WalletOwnerType.PLATFORM,
      platformCode,
      currency,
    });
  }

  async canAccessShopWallet(
    shopId: string,
    requesterUserId: string,
    requesterRole: string,
  ) {
    if (requesterRole === 'admin') return true;
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, ownerUserId: requesterUserId },
      select: { id: true },
    });
    return Boolean(shop);
  }

  async listLedger(
    walletId: string,
    page = 1,
    pageSize = 20,
  ): Promise<WalletLedgerPage> {
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(100, Math.max(1, pageSize));
    const where = { walletId };
    const [data, totalItems] = await this.prisma.$transaction([
      this.prisma.walletLedgerEntry.findMany({
        where,
        include: { transaction: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
      }),
      this.prisma.walletLedgerEntry.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page: safePage,
        pageSize: safePageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / safePageSize),
      },
    };
  }

  async executeTransaction(input: WalletTransactionInput) {
    const result = await this.prisma
      .$transaction(
        (tx) => this.executeTransactionInTransaction(tx, input),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )
      .catch((error) => {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException('Wallet transaction already exists');
        }
        throw error;
      });
    void this.notifyWalletTransaction(result).catch(() => undefined);
    return result;
  }

  private async notifyWalletTransaction(transaction: Prisma.WalletTransactionGetPayload<{ include: { ledgerEntries: true } }>) {
    const recipients = await this.prisma.wallet.findMany({ where: { id: { in: transaction.ledgerEntries.map((entry) => entry.walletId) } }, select: { userId: true, shop: { select: { ownerUserId: true } } } });
    const userIds = new Set(recipients.flatMap((wallet) => [wallet.userId, wallet.shop?.ownerUserId].filter((id): id is string => Boolean(id))));
    if (!userIds.size) return;
    const labels: Record<string, [string, string]> = {
      PAYMENT: ['Thanh toán bằng ví', 'Bạn đã thanh toán đơn hàng bằng ví.'],
      REFUND: ['Hoàn tiền', `Bạn đã nhận được ${transaction.amount.toFixed(2)} đồng tiền hoàn trả.`],
      AFFILIATE_COMMISSION: ['Nhận hoa hồng affiliate', `Bạn đã nhận được ${transaction.amount.toFixed(2)} đồng tiền hoa hồng affiliate.`],
      DISPUTE_HOLD: ['Tiền bị khóa', 'Một phần tiền trong ví shop đã bị khóa do tranh chấp.'],
      DISPUTE_RELEASE: ['Tiền được mở khóa', 'Tiền trong ví shop đã được mở khóa sau tranh chấp.'],
      DISPUTE_REFUND: ['Hoàn tiền tranh chấp', `Bạn đã nhận được ${transaction.amount.toFixed(2)} đồng tiền hoàn trả do tranh chấp.`],
      SETTLEMENT: ['Đối soát thành công', `Shop đã nhận được ${transaction.amount.toFixed(2)} đồng từ đối soát.`],
      WITHDRAWAL_REQUEST: ['Đã tạo yêu cầu rút tiền', 'Yêu cầu rút tiền của bạn đã được tạo.'],
      WITHDRAWAL: ['Cập nhật rút tiền', 'Yêu cầu rút tiền của bạn đã được xử lý.'],
    };
    const [title, body] = labels[transaction.transactionType] ?? [];
    if (!title) return;
    await Promise.all([...userIds].map((userId) => this.prisma.notification.upsert({ where: { dedupeKey: `WALLET:${transaction.id}:${userId}` }, update: {}, create: { userId, notificationType: `WALLET_${transaction.transactionType}`, title, body, targetType: 'WALLET_TRANSACTION', targetId: transaction.referenceId, dedupeKey: `WALLET:${transaction.id}:${userId}` } })));
  }

  async executeTransactionInTransaction(
    tx: WalletClient,
    input: WalletTransactionInput,
  ) {
          const existing = await tx.walletTransaction.findUnique({
            where: { idempotencyKey: input.idempotencyKey },
            include: { ledgerEntries: true },
          });
          if (existing) return existing;

          if (!input.allowUnbalanced) assertBalancedLedger(input.entries);

          const walletIds = [
            ...new Set(input.entries.map((entry) => entry.walletId)),
          ];
          const wallets = await tx.wallet.findMany({
            where: { id: { in: walletIds } },
          });
          if (wallets.length !== walletIds.length) {
            throw new WalletDomainError(
              WALLET_ERROR_CODES.WALLET_NOT_FOUND,
              'Không tìm thấy ví.',
            );
          }

          const walletById = new Map(
            wallets.map((wallet) => [wallet.id, wallet]),
          );
          const nextBalances = new Map<
            string,
            {
              available: Prisma.Decimal;
              pending: Prisma.Decimal;
              locked: Prisma.Decimal;
              version: number;
            }
          >();

          for (const entry of input.entries) {
            const wallet = walletById.get(entry.walletId)!;
            if (
              wallet.status === WalletStatus.FROZEN ||
              wallet.status === WalletStatus.CLOSED
            ) {
              throw new WalletDomainError(
                WALLET_ERROR_CODES.WALLET_FROZEN,
                'Ví hiện đang bị khóa.',
              );
            }

            const current = nextBalances.get(wallet.id) ?? {
              available: wallet.availableBalance,
              pending: wallet.pendingBalance,
              locked: wallet.lockedBalance,
              version: wallet.version,
            };
            const key = entry.balanceType;
            const balance =
              key === WalletBalanceType.AVAILABLE
                ? current.available
                : key === WalletBalanceType.PENDING
                  ? current.pending
                  : current.locked;
            const next =
              entry.direction === WalletEntryDirection.CREDIT
                ? balance.plus(entry.amount)
                : balance.minus(entry.amount);
            if (next.lt(0)) {
              throw new WalletDomainError(
                WALLET_ERROR_CODES.INSUFFICIENT_BALANCE,
                'Số dư ví không đủ để thực hiện giao dịch.',
              );
            }

            if (key === WalletBalanceType.AVAILABLE) current.available = next;
            else if (key === WalletBalanceType.PENDING) current.pending = next;
            else current.locked = next;
            nextBalances.set(wallet.id, current);
          }

          const transaction = await tx.walletTransaction.create({
            data: {
              transactionCode: input.transactionCode,
              transactionType: input.transactionType,
              amount: input.amount,
              currency: input.currency ?? 'VND',
              idempotencyKey: input.idempotencyKey,
              referenceType: input.referenceType ?? null,
              referenceId: input.referenceId ?? null,
              description: input.description ?? null,
              orderId: input.orderId ?? null,
              paymentIntentId: input.paymentIntentId ?? null,
              status: 'COMPLETED',
              completedAt: new Date(),
            },
          });

          const entries: Prisma.WalletLedgerEntryGetPayload<{}>[] = [];
          for (const entry of input.entries) {
            const wallet = walletById.get(entry.walletId)!;
            const before =
              entry.balanceType === WalletBalanceType.AVAILABLE
                ? wallet.availableBalance
                : entry.balanceType === WalletBalanceType.PENDING
                  ? wallet.pendingBalance
                  : wallet.lockedBalance;
            const after =
              entry.direction === WalletEntryDirection.CREDIT
                ? before.plus(entry.amount)
                : before.minus(entry.amount);
            entries.push(
              await tx.walletLedgerEntry.create({
                data: {
                  walletId: entry.walletId,
                  transactionId: transaction.id,
                  direction: entry.direction,
                  balanceType: entry.balanceType,
                  amount: entry.amount,
                  balanceBefore: before,
                  balanceAfter: after,
                },
              }),
            );
            if (entry.balanceType === WalletBalanceType.AVAILABLE)
              wallet.availableBalance = after;
            else if (entry.balanceType === WalletBalanceType.PENDING)
              wallet.pendingBalance = after;
            else wallet.lockedBalance = after;
          }

          for (const [walletId, balances] of nextBalances) {
            const result = await tx.wallet.updateMany({
              where: {
                id: walletId,
                version: balances.version,
                status: WalletStatus.ACTIVE,
              },
              data: {
                availableBalance: balances.available,
                pendingBalance: balances.pending,
                lockedBalance: balances.locked,
                version: { increment: 1 },
              },
            });
            if (result.count !== 1) {
              throw new WalletDomainError(
                WALLET_ERROR_CODES.WALLET_CONCURRENT_UPDATE,
                'Ví đang được cập nhật bởi một giao dịch khác. Vui lòng thử lại.',
              );
            }
          }

          return { ...transaction, ledgerEntries: entries };
  }

  findOrCreateUserWalletInTransaction(tx: WalletClient, userId: string, currency = 'VND') {
    return this.findOrCreateWallet({ ownerType: WalletOwnerType.USER, userId, currency }, tx);
  }

  findOrCreatePlatformWalletInTransaction(tx: WalletClient, platformCode: string, currency = 'VND') {
    return this.findOrCreateWallet({ ownerType: WalletOwnerType.PLATFORM, platformCode, currency }, tx);
  }

  async getReconciliation(input: { fromDate?: string; toDate?: string; shopId?: string; transactionType?: string; status?: string; page?: number; limit?: number }) {
    const page = Math.max(1, input.page ?? 1), limit = Math.min(100, Math.max(1, input.limit ?? 20));
    const where: Prisma.WalletTransactionWhereInput = {
      ...(input.transactionType ? { transactionType: input.transactionType as any } : {}),
      ...(input.status ? { status: input.status as any } : {}),
      ...(input.fromDate || input.toDate ? { createdAt: { ...(input.fromDate ? { gte: new Date(input.fromDate) } : {}), ...(input.toDate ? { lte: new Date(input.toDate) } : {}) } } : {}),
      ...(input.shopId ? { ledgerEntries: { some: { wallet: { shopId: input.shopId } } } } : {}),
    };
    const ledgerWhere = { transaction: where };
    const [items, total, credits, debits, topUp, payment, escrowHeld, released, platformFee, refund, withdrawal] = await this.prisma.$transaction([
      this.prisma.walletTransaction.findMany({ where, select: { transactionType: true, status: true, amount: true, currency: true, referenceType: true, referenceId: true, createdAt: true }, orderBy: [{ createdAt: 'desc' }, { transactionCode: 'desc' }], skip: (page - 1) * limit, take: limit }),
      this.prisma.walletTransaction.count({ where }),
      this.prisma.walletLedgerEntry.aggregate({ where: ledgerWhere, _sum: { amount: true } }),
      this.prisma.walletLedgerEntry.aggregate({ where: { ...ledgerWhere, direction: 'DEBIT' }, _sum: { amount: true } }),
      this.prisma.walletTransaction.aggregate({ where: { ...where, transactionType: 'TOP_UP' }, _sum: { amount: true } }),
      this.prisma.walletTransaction.aggregate({ where: { ...where, transactionType: 'PAYMENT' }, _sum: { amount: true } }),
      this.prisma.walletTransaction.aggregate({ where: { ...where, transactionType: 'ESCROW_HOLD' }, _sum: { amount: true } }),
      this.prisma.walletTransaction.aggregate({ where: { ...where, transactionType: 'ESCROW_RELEASE' }, _sum: { amount: true } }),
      this.prisma.walletTransaction.aggregate({ where: { ...where, transactionType: 'PLATFORM_FEE' }, _sum: { amount: true } }),
      this.prisma.walletTransaction.aggregate({ where: { ...where, transactionType: { in: ['REFUND', 'DISPUTE_REFUND'] as any } }, _sum: { amount: true } }),
      this.prisma.walletTransaction.aggregate({ where: { ...where, transactionType: { in: ['WITHDRAWAL', 'WITHDRAWAL_REQUEST'] as any } }, _sum: { amount: true } }),
    ]);
    const sum = (value: Prisma.Decimal | null | undefined) => (value ?? new Prisma.Decimal(0)).toFixed(2);
    return { summary: { totalTopUp: sum(topUp._sum.amount), totalPayment: sum(payment._sum.amount), totalEscrowHeld: sum(escrowHeld._sum.amount), totalReleasedToShops: sum(released._sum.amount), totalPlatformFee: sum(platformFee._sum.amount), totalRefund: sum(refund._sum.amount), totalWithdrawal: sum(withdrawal._sum.amount), difference: sum((credits._sum.amount ?? new Prisma.Decimal(0)).minus(debits._sum.amount ?? new Prisma.Decimal(0))) }, items: items.map((item) => ({ transactionType: item.transactionType, status: item.status, amount: item.amount.toFixed(2), currency: item.currency, referenceType: item.referenceType, referenceId: item.referenceId, createdAt: item.createdAt })), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  findOrCreateShopWalletInTransaction(tx: WalletClient, shopId: string, currency = 'VND') {
    return this.findOrCreateWallet({ ownerType: WalletOwnerType.SHOP, shopId, currency }, tx);
  }

  findShopWalletInTransaction(tx: WalletClient, shopId: string, currency = 'VND') {
    return tx.wallet.findUnique({
      where: { shopId_currency: { shopId, currency } },
    });
  }

  findShopWallet(shopId: string, currency = 'VND') {
    return this.prisma.wallet.findUnique({
      where: { shopId_currency: { shopId, currency } },
    });
  }

  findWithdrawalInTransaction(tx: WalletClient, id: string) {
    return tx.walletWithdrawal.findUnique({ where: { id } });
  }

  listWithdrawals(walletId: string) {
    return this.prisma.walletWithdrawal.findMany({
      where: { walletId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  async listAllWithdrawals(page = 1, pageSize = 20, status?: string) {
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(100, Math.max(1, pageSize));
    const where = status ? { status: status as any } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.walletWithdrawal.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (safePage - 1) * safePageSize, take: safePageSize }),
      this.prisma.walletWithdrawal.count({ where }),
    ]);
    return { items: items.map((withdrawal) => ({ id: withdrawal.id, walletId: withdrawal.walletId, amount: withdrawal.amount.toFixed(2), bankName: withdrawal.bankName, accountNumber: withdrawal.accountNumber, accountHolder: withdrawal.accountHolder, status: withdrawal.status, createdAt: withdrawal.createdAt, processedAt: withdrawal.processedAt })), pagination: { page: safePage, limit: safePageSize, total, totalPages: Math.ceil(total / safePageSize) } };
  }

  async listPlatformWallets() {
    const wallets = await Promise.all(['PLATFORM_REVENUE_VND', 'PLATFORM_ESCROW_VND'].map((platformCode) => this.findOrCreatePlatformWallet(platformCode, 'VND')));
    return Promise.all(wallets.map(async (wallet) => ({ wallet: { walletCode: wallet.walletCode, platformCode: wallet.platformCode, currency: wallet.currency, availableBalance: wallet.availableBalance.toFixed(2), pendingBalance: wallet.pendingBalance.toFixed(2), lockedBalance: wallet.lockedBalance.toFixed(2), status: wallet.status }, ledger: await this.listLedger(wallet.id, 1, 20) })));
  }

  private async findOrCreateWallet(input: {
    ownerType: WalletOwnerType;
    userId?: string;
    shopId?: string;
    platformCode?: string;
    currency: string;
  }, client: WalletClient | PrismaService = this.prisma) {
    const where = input.userId
      ? { userId_currency: { userId: input.userId, currency: input.currency } }
      : input.shopId
        ? {
            shopId_currency: { shopId: input.shopId, currency: input.currency },
          }
        : { platformCode: input.platformCode! };
    const existing = await client.wallet.findUnique({ where });
    if (existing) return existing;

    try {
      return await client.wallet.create({
        data: {
          walletCode: `${input.ownerType.toLowerCase()}_${input.userId ?? input.shopId ?? input.platformCode}_${input.currency.toLowerCase()}`,
          ownerType: input.ownerType,
          userId: input.userId,
          shopId: input.shopId,
          platformCode: input.platformCode,
          currency: input.currency,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const raced = await client.wallet.findUnique({ where });
        if (raced) return raced;
      }
      throw error;
    }
  }
}
