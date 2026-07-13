import {
  Prisma,
  WalletBalanceType,
  WalletEntryDirection,
  WalletOwnerType,
  WalletStatus,
  WalletTransactionType,
} from '@prisma/client';
import { WalletRepository } from './wallet.repository';
import { WALLET_ERROR_CODES, WalletDomainError } from '../../domain';

const decimal = (value: number | string) => new Prisma.Decimal(value);

function makeWallet(
  id: string,
  balance = 0,
  overrides: Record<string, unknown> = {},
) {
  return {
    id,
    walletCode: `user_${id}_vnd`,
    ownerType: WalletOwnerType.USER,
    userId: id,
    shopId: null,
    platformCode: null,
    currency: 'VND',
    availableBalance: decimal(balance),
    pendingBalance: decimal(0),
    lockedBalance: decimal(0),
    status: WalletStatus.ACTIVE,
    version: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

class WalletPrismaDouble {
  wallets: any[] = [];
  transactions: any[] = [];
  ledgerEntries: any[] = [];
  failLedgerAt: number | null = null;
  beforeUpdate?: () => void;

  wallet = {
    findUnique: async ({ where }: any) =>
      this.wallets.find((wallet) =>
        where.id
          ? wallet.id === where.id
          : where.userId_currency
            ? wallet.userId === where.userId_currency.userId &&
              wallet.currency === where.userId_currency.currency
            : where.shopId_currency
              ? wallet.shopId === where.shopId_currency.shopId &&
                wallet.currency === where.shopId_currency.currency
              : wallet.platformCode === where.platformCode,
      ) ?? null,
    findMany: async ({ where }: any) =>
      this.wallets.filter((wallet) => where.id.in.includes(wallet.id)),
    create: async ({ data }: any) => {
      const wallet = makeWallet(
        data.userId ?? data.shopId ?? data.platformCode,
        0,
        data,
      );
      this.wallets.push(wallet);
      return wallet;
    },
    updateMany: async ({ where, data }: any) => {
      this.beforeUpdate?.();
      const wallet = this.wallets.find(
        (candidate) =>
          candidate.id === where.id &&
          candidate.version === where.version &&
          candidate.status === where.status,
      );
      if (!wallet) return { count: 0 };
      wallet.availableBalance = data.availableBalance;
      wallet.pendingBalance = data.pendingBalance;
      wallet.lockedBalance = data.lockedBalance;
      wallet.version += data.version.increment;
      return { count: 1 };
    },
  };

  walletTransaction = {
    findUnique: async ({ where }: any) => {
      const transaction = this.transactions.find(
        (candidate) => candidate.idempotencyKey === where.idempotencyKey,
      );
      return transaction
        ? {
            ...transaction,
            ledgerEntries: this.ledgerEntries.filter(
              (entry) => entry.transactionId === transaction.id,
            ),
          }
        : null;
    },
    create: async ({ data }: any) => {
      const transaction = { ...data, id: `tx-${this.transactions.length + 1}` };
      this.transactions.push(transaction);
      return transaction;
    },
  };

  walletLedgerEntry = {
    create: async ({ data }: any) => {
      if (
        this.failLedgerAt !== null &&
        this.ledgerEntries.length === this.failLedgerAt
      )
        throw new Error('ledger write failed');
      const entry = { ...data, id: `entry-${this.ledgerEntries.length + 1}` };
      this.ledgerEntries.push(entry);
      return entry;
    },
  };

  shop = {
    findFirst: async ({ where }: any) =>
      where.ownerUserId === 'owner-1' ? { id: where.id } : null,
  };

  async $transaction(callback: any) {
    const snapshot = {
      wallets: this.wallets.map((wallet) => ({ ...wallet })),
      transactions: [...this.transactions],
      ledgerEntries: [...this.ledgerEntries],
    };
    try {
      return await callback(this);
    } catch (error) {
      this.wallets = snapshot.wallets;
      this.transactions = snapshot.transactions;
      this.ledgerEntries = snapshot.ledgerEntries;
      throw error;
    }
  }
}

function makeInput(overrides: Partial<any> = {}) {
  return {
    transactionCode: `TRX-${Date.now()}-${Math.random()}`,
    transactionType: WalletTransactionType.TOP_UP,
    idempotencyKey: `idem-${Date.now()}-${Math.random()}`,
    amount: decimal(100),
    entries: [
      {
        walletId: 'wallet-1',
        direction: WalletEntryDirection.DEBIT,
        balanceType: WalletBalanceType.AVAILABLE,
        amount: decimal(100),
      },
      {
        walletId: 'wallet-2',
        direction: WalletEntryDirection.CREDIT,
        balanceType: WalletBalanceType.AVAILABLE,
        amount: decimal(100),
      },
    ],
    ...overrides,
  };
}

describe('WalletRepository', () => {
  let prisma: WalletPrismaDouble;
  let repository: WalletRepository;

  beforeEach(() => {
    prisma = new WalletPrismaDouble();
    prisma.wallets.push(makeWallet('wallet-1', 100), makeWallet('wallet-2', 0));
    repository = new WalletRepository(prisma as never);
  });

  it('creates a new user VND wallet with zero balances and reuses it', async () => {
    prisma.wallets = [];
    const first = await repository.findOrCreateUserWallet('user-1');
    const second = await repository.findOrCreateUserWallet('user-1');
    expect(first.id).toBe(second.id);
    expect(first.availableBalance.equals(0)).toBe(true);
    expect(prisma.wallets).toHaveLength(1);
  });

  it('executes a balanced double-entry transfer and increments versions', async () => {
    await repository.executeTransaction(makeInput());
    expect(prisma.wallets[0].availableBalance.equals(0)).toBe(true);
    expect(prisma.wallets[1].availableBalance.equals(100)).toBe(true);
    expect(prisma.wallets[0].version).toBe(1);
    expect(prisma.ledgerEntries).toHaveLength(2);
  });

  it('rejects unbalanced debit and credit totals', async () => {
    await expect(
      repository.executeTransaction(
        makeInput({
          entries: [
            makeInput().entries[0],
            { ...makeInput().entries[1], amount: decimal(99) },
          ],
        }),
      ),
    ).rejects.toMatchObject({ code: WALLET_ERROR_CODES.UNBALANCED_LEDGER });
    expect(prisma.transactions).toHaveLength(0);
  });

  it('rolls back when a debit would make a balance negative', async () => {
    await expect(
      repository.executeTransaction(
        makeInput({
          entries: [
            {
              walletId: 'wallet-1',
              direction: WalletEntryDirection.DEBIT,
              balanceType: WalletBalanceType.AVAILABLE,
              amount: decimal(101),
            },
            {
              walletId: 'wallet-2',
              direction: WalletEntryDirection.CREDIT,
              balanceType: WalletBalanceType.AVAILABLE,
              amount: decimal(101),
            },
          ],
        }),
      ),
    ).rejects.toMatchObject({ code: WALLET_ERROR_CODES.INSUFFICIENT_BALANCE });
    expect(prisma.wallets[0].availableBalance.equals(100)).toBe(true);
    expect(prisma.transactions).toHaveLength(0);
  });

  it.each([
    WalletBalanceType.AVAILABLE,
    WalletBalanceType.PENDING,
    WalletBalanceType.LOCKED,
  ])('never leaves a negative %s balance', async (balanceType) => {
    const amount = balanceType === WalletBalanceType.AVAILABLE ? 101 : 1;
    await expect(
      repository.executeTransaction(
        makeInput({
          entries: [
            {
              walletId: 'wallet-1',
              direction: WalletEntryDirection.DEBIT,
              balanceType,
              amount: decimal(amount),
            },
            {
              walletId: 'wallet-2',
              direction: WalletEntryDirection.CREDIT,
              balanceType,
              amount: decimal(amount),
            },
          ],
        }),
      ),
    ).rejects.toMatchObject({ code: WALLET_ERROR_CODES.INSUFFICIENT_BALANCE });
    expect(prisma.transactions).toHaveLength(0);
  });

  it('rejects frozen wallets without changing balances', async () => {
    prisma.wallets[0].status = WalletStatus.FROZEN;
    await expect(
      repository.executeTransaction(makeInput()),
    ).rejects.toMatchObject({ code: WALLET_ERROR_CODES.WALLET_FROZEN });
    expect(prisma.wallets[0].availableBalance.equals(100)).toBe(true);
  });

  it('returns the existing transaction for a repeated idempotency key', async () => {
    const input = makeInput();
    await repository.executeTransaction(input);
    await repository.executeTransaction(input);
    expect(prisma.transactions).toHaveLength(1);
    expect(prisma.ledgerEntries).toHaveLength(2);
  });

  it('rejects a stale version and preserves the prior state', async () => {
    prisma.beforeUpdate = () => {
      prisma.wallets[0].version += 1;
    };
    await expect(
      repository.executeTransaction(makeInput()),
    ).rejects.toMatchObject({
      code: WALLET_ERROR_CODES.WALLET_CONCURRENT_UPDATE,
    });
    expect(prisma.transactions).toHaveLength(0);
    expect(prisma.ledgerEntries).toHaveLength(0);
  });

  it('rolls back transaction and balances when a ledger entry fails', async () => {
    prisma.failLedgerAt = 1;
    await expect(repository.executeTransaction(makeInput())).rejects.toThrow(
      'ledger write failed',
    );
    expect(prisma.transactions).toHaveLength(0);
    expect(prisma.ledgerEntries).toHaveLength(0);
    expect(prisma.wallets[0].availableBalance.equals(100)).toBe(true);
  });

  it('allows only the shop owner or admin to access a shop wallet', async () => {
    await expect(
      repository.canAccessShopWallet('shop-1', 'other-user', 'user'),
    ).resolves.toBe(false);
    await expect(
      repository.canAccessShopWallet('shop-1', 'owner-1', 'user'),
    ).resolves.toBe(true);
    await expect(
      repository.canAccessShopWallet('shop-1', 'other-user', 'admin'),
    ).resolves.toBe(true);
  });
});
