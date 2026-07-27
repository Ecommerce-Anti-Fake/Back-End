export interface MyWalletLookupMessage {
  userId: string;
}

export interface ShopWalletLookupMessage {
  shopId: string;
  requesterUserId: string;
  requesterRole: string;
}

export interface WalletTransactionsLookupMessage {
  userId: string;
  page: number;
  limit: number;
}

export interface ShopWalletTransactionsLookupMessage extends ShopWalletLookupMessage {
  page: number;
  limit: number;
}

export interface WalletWithdrawalMessage {
  shopId?: string;
  requesterUserId: string;
  requesterRole: string;
  amount: string;
  payoutAccountId: string;
  idempotencyKey: string;
  authorizationToken: string;
}

export interface ShopWalletWithdrawalMessage extends WalletWithdrawalMessage {
  shopId: string;
}

export interface WalletWithdrawalActionMessage {
  id: string;
  adminUserId: string;
  reason?: string;
  transferReference?: string;
}

export interface PayoutAccountOwnerMessage {
  userId: string;
  requesterRole: string;
  shopId?: string;
}

export interface PayoutAccountCreateMessage extends PayoutAccountOwnerMessage {
  authorizationToken: string;
  verificationId: string;
}

export interface BankAccountVerificationMessage extends PayoutAccountOwnerMessage {
  bankBin: string;
  accountNumber: string;
}

export interface PayoutAccountDisableMessage extends PayoutAccountOwnerMessage {
  payoutAccountId: string;
  authorizationToken: string;
}

export interface WithdrawalAuthorizationChallengeMessage extends PayoutAccountOwnerMessage {
  operation: 'CREATE_PAYOUT_ACCOUNT' | 'DELETE_PAYOUT_ACCOUNT' | 'CREATE_WITHDRAWAL';
  channel: 'PHONE' | 'EMAIL';
  payoutAccountId?: string;
  amount?: string;
  bankAccountVerificationId?: string;
}

export interface WithdrawalAuthorizationVerifyMessage {
  challengeId: string;
  userId: string;
  firebaseIdToken: string;
}

export interface WalletTopUpCreateMessage {
  userId: string;
  requesterRole?: string;
  shopId?: string;
  amount: string;
  idempotencyKey: string;
}

export interface WalletTopUpWebhookMessage {
  code: string;
  desc: string;
  success: boolean;
  signature: string;
  data: Record<string, unknown>;
}
