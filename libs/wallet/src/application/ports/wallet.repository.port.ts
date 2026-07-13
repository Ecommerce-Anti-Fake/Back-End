import { Prisma } from '@prisma/client';
import {
  WalletBalanceType,
  WalletEntryDirection,
  WalletTransactionType,
} from '@prisma/client';
import { WalletLedgerInput } from '../../domain';

export interface WalletLedgerPage {
  data: Prisma.WalletLedgerEntryGetPayload<{
    include: { transaction: true };
  }>[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface WalletTransactionInput {
  transactionCode: string;
  transactionType: WalletTransactionType;
  idempotencyKey: string;
  amount: Prisma.Decimal;
  currency?: string;
  referenceType?: string | null;
  referenceId?: string | null;
  description?: string | null;
  entries: WalletLedgerInput[];
}

export abstract class WalletRepositoryPort {
  abstract findById(
    walletId: string,
  ): Promise<Prisma.WalletGetPayload<{}> | null>;
  abstract findOrCreateUserWallet(
    userId: string,
    currency?: string,
  ): Promise<Prisma.WalletGetPayload<{}>>;
  abstract findOrCreateShopWallet(
    shopId: string,
    currency?: string,
  ): Promise<Prisma.WalletGetPayload<{}>>;
  abstract findOrCreatePlatformWallet(
    platformCode: string,
    currency?: string,
  ): Promise<Prisma.WalletGetPayload<{}>>;
  abstract canAccessShopWallet(
    shopId: string,
    requesterUserId: string,
    requesterRole: string,
  ): Promise<boolean>;
  abstract listLedger(
    walletId: string,
    page?: number,
    pageSize?: number,
  ): Promise<WalletLedgerPage>;
  abstract executeTransaction(
    input: WalletTransactionInput,
  ): Promise<
    Prisma.WalletTransactionGetPayload<{ include: { ledgerEntries: true } }>
  >;
}
