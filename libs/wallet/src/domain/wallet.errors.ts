export const WALLET_ERROR_CODES = {
  WALLET_NOT_FOUND: 'WALLET_NOT_FOUND',
  WALLET_FROZEN: 'WALLET_FROZEN',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  UNBALANCED_LEDGER: 'UNBALANCED_LEDGER',
  WALLET_CONCURRENT_UPDATE: 'WALLET_CONCURRENT_UPDATE',
} as const;

export type WalletErrorCode =
  (typeof WALLET_ERROR_CODES)[keyof typeof WALLET_ERROR_CODES];

export class WalletDomainError extends Error {
  constructor(
    public readonly code: WalletErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'WalletDomainError';
  }
}
