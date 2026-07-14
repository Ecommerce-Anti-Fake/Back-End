import {
  Prisma,
  WalletBalanceType,
  WalletEntryDirection,
} from '@prisma/client';
import { assertBalancedLedger } from './wallet-ledger';
import { WALLET_ERROR_CODES, WalletDomainError } from './wallet.errors';

describe('assertBalancedLedger', () => {
  const entry = (direction: WalletEntryDirection, amount: number) => ({
    walletId: 'wallet-1',
    direction,
    balanceType: WalletBalanceType.AVAILABLE,
    amount: new Prisma.Decimal(amount),
  });

  it('accepts equal debit and credit totals', () => {
    expect(() =>
      assertBalancedLedger([
        entry(WalletEntryDirection.DEBIT, 100),
        entry(WalletEntryDirection.CREDIT, 100),
      ]),
    ).not.toThrow();
  });

  it('rejects unbalanced totals with a domain code', () => {
    expect(() =>
      assertBalancedLedger([
        entry(WalletEntryDirection.DEBIT, 99),
        entry(WalletEntryDirection.CREDIT, 100),
      ]),
    ).toThrow(WalletDomainError);
    expect(() =>
      assertBalancedLedger([
        entry(WalletEntryDirection.DEBIT, 99),
        entry(WalletEntryDirection.CREDIT, 100),
      ]),
    ).toThrow(
      expect.objectContaining({ code: WALLET_ERROR_CODES.UNBALANCED_LEDGER }),
    );
  });
});
