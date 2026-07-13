import { Prisma } from '@prisma/client';

const decimalToString = (value: Prisma.Decimal) => value.toFixed(2);

export function toWalletResponse(wallet: Prisma.WalletGetPayload<{}>) {
  return {
    currency: wallet.currency,
    availableBalance: decimalToString(wallet.availableBalance),
    pendingBalance: decimalToString(wallet.pendingBalance),
    lockedBalance: decimalToString(wallet.lockedBalance),
    status: wallet.status,
  };
}

export function toWalletLedgerResponse(result: {
  data: Array<
    Prisma.WalletLedgerEntryGetPayload<{ include: { transaction: true } }>
  >;
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}) {
  return {
    items: result.data.map((entry) => ({
      transactionCode: entry.transaction.transactionCode,
      transactionType: entry.transaction.transactionType,
      status: entry.transaction.status,
      direction: entry.direction,
      balanceType: entry.balanceType,
      amount: decimalToString(entry.amount),
      description: entry.transaction.description,
      createdAt: entry.createdAt,
    })),
    pagination: {
      page: result.pagination.page,
      limit: result.pagination.pageSize,
      total: result.pagination.totalItems,
      totalPages: result.pagination.totalPages,
    },
  };
}
