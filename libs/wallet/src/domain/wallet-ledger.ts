import { Prisma } from '@prisma/client';
import { WalletEntryDirection, WalletBalanceType } from '@prisma/client';
import { WALLET_ERROR_CODES, WalletDomainError } from './wallet.errors';

export interface WalletLedgerInput {
  walletId: string;
  direction: WalletEntryDirection;
  balanceType: WalletBalanceType;
  amount: Prisma.Decimal;
}

export function assertBalancedLedger(entries: readonly WalletLedgerInput[]) {
  const debit = entries
    .filter((entry) => entry.direction === WalletEntryDirection.DEBIT)
    .reduce((total, entry) => total.plus(entry.amount), new Prisma.Decimal(0));
  const credit = entries
    .filter((entry) => entry.direction === WalletEntryDirection.CREDIT)
    .reduce((total, entry) => total.plus(entry.amount), new Prisma.Decimal(0));

  if (entries.length === 0 || !debit.equals(credit)) {
    throw new WalletDomainError(
      WALLET_ERROR_CODES.UNBALANCED_LEDGER,
      'Wallet ledger debit and credit totals must be equal',
    );
  }

  for (const entry of entries) {
    if (entry.amount.lte(0)) {
      throw new WalletDomainError(
        WALLET_ERROR_CODES.UNBALANCED_LEDGER,
        'Wallet ledger amounts must be greater than zero',
      );
    }
  }
}
