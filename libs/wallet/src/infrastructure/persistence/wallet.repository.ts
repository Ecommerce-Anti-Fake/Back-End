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
    return this.prisma
      .$transaction(
        async (tx) => {
          const existing = await tx.walletTransaction.findUnique({
            where: { idempotencyKey: input.idempotencyKey },
            include: { ledgerEntries: true },
          });
          if (existing) return existing;

          assertBalancedLedger(input.entries);

          const walletIds = [
            ...new Set(input.entries.map((entry) => entry.walletId)),
          ];
          const wallets = await tx.wallet.findMany({
            where: { id: { in: walletIds } },
          });
          if (wallets.length !== walletIds.length) {
            throw new WalletDomainError(
              WALLET_ERROR_CODES.WALLET_NOT_FOUND,
              'Wallet not found',
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
                'Wallet is not available for transactions',
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
                'Wallet balance is insufficient',
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
              status: 'COMPLETED',
              completedAt: new Date(),
            },
          });

          const entries = [];
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
                'Wallet was updated concurrently',
              );
            }
          }

          return { ...transaction, ledgerEntries: entries };
        },
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
  }

  private async findOrCreateWallet(input: {
    ownerType: WalletOwnerType;
    userId?: string;
    shopId?: string;
    platformCode?: string;
    currency: string;
  }) {
    const where = input.userId
      ? { userId_currency: { userId: input.userId, currency: input.currency } }
      : input.shopId
        ? {
            shopId_currency: { shopId: input.shopId, currency: input.currency },
          }
        : { platformCode: input.platformCode! };
    const existing = await this.prisma.wallet.findUnique({ where });
    if (existing) return existing;

    try {
      return await this.prisma.wallet.create({
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
        const raced = await this.prisma.wallet.findUnique({ where });
        if (raced) return raced;
      }
      throw error;
    }
  }
}
