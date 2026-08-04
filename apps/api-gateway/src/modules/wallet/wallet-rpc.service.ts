import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CATALOG_SERVICE_CLIENT, WALLET_MESSAGE_PATTERNS } from '@contracts';
import { throwHttpExceptionFromRpc } from '@common';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class WalletRpcService {
  constructor(@Inject(CATALOG_SERVICE_CLIENT) private readonly catalogClient: ClientProxy) {}

  listBanks() {
    return this.send(WALLET_MESSAGE_PATTERNS.listBanks, {});
  }
  verifyBankAccount(payload: PayoutOwnerPayload & { bankBin: string; accountNumber: string }) {
    return this.send(WALLET_MESSAGE_PATTERNS.verifyBankAccount, payload);
  }

  getMyWallet(payload: { userId: string }) { return this.send(WALLET_MESSAGE_PATTERNS.getMyWallet, payload); }
  getMyWalletTransactions(payload: { userId: string; page: number; limit: number }) {
    return this.send(WALLET_MESSAGE_PATTERNS.getMyWalletTransactions, payload);
  }
  getShopWallet(payload: { shopId: string; requesterUserId: string; requesterRole: string }) {
    return this.send(WALLET_MESSAGE_PATTERNS.getShopWallet, payload);
  }
  getShopWalletTransactions(payload: { shopId: string; requesterUserId: string; requesterRole: string; page: number; limit: number }) {
    return this.send(WALLET_MESSAGE_PATTERNS.getShopWalletTransactions, payload);
  }

  requestShopWalletWithdrawal(payload: WithdrawalPayload & { shopId: string }) {
    return this.send(WALLET_MESSAGE_PATTERNS.requestShopWalletWithdrawal, payload);
  }
  requestUserWalletWithdrawal(payload: WithdrawalPayload) {
    return this.send(WALLET_MESSAGE_PATTERNS.requestUserWalletWithdrawal, payload);
  }
  listShopWalletWithdrawals(payload: { shopId: string; requesterUserId: string; requesterRole: string }) {
    return this.send(WALLET_MESSAGE_PATTERNS.listShopWalletWithdrawals, payload);
  }
  listShopCodSettlements(payload: { shopId: string; requesterUserId: string; requesterRole: string }) {
    return this.send(WALLET_MESSAGE_PATTERNS.listShopCodSettlements, payload);
  }
  listUserWalletWithdrawals(payload: { userId: string }) {
    return this.send(WALLET_MESSAGE_PATTERNS.listUserWalletWithdrawals, payload);
  }

  approveWalletWithdrawal(payload: { id: string; adminUserId: string }) {
    return this.send(WALLET_MESSAGE_PATTERNS.approveWalletWithdrawal, payload);
  }
  completeWalletWithdrawal(payload: { id: string; adminUserId: string; transferReference: string }) {
    return this.send(WALLET_MESSAGE_PATTERNS.completeWalletWithdrawal, payload);
  }
  cancelWalletWithdrawal(payload: { id: string; shopId?: string; requesterUserId: string; requesterRole: string }) {
    return this.send(WALLET_MESSAGE_PATTERNS.cancelWalletWithdrawal, payload);
  }
  rejectWalletWithdrawal(payload: { id: string; adminUserId: string; reason: string }) {
    return this.send(WALLET_MESSAGE_PATTERNS.rejectWalletWithdrawal, payload);
  }

  createPayoutAccount(payload: PayoutOwnerPayload & PayoutAccountPayload) {
    return this.send(WALLET_MESSAGE_PATTERNS.createPayoutAccount, payload);
  }
  listPayoutAccounts(payload: PayoutOwnerPayload) {
    return this.send(WALLET_MESSAGE_PATTERNS.listPayoutAccounts, payload);
  }
  disablePayoutAccount(payload: PayoutOwnerPayload & { payoutAccountId: string; authorizationToken: string }) {
    return this.send(WALLET_MESSAGE_PATTERNS.disablePayoutAccount, payload);
  }
  createWithdrawalAuthorizationChallenge(payload: PayoutOwnerPayload & ChallengePayload) {
    return this.send(WALLET_MESSAGE_PATTERNS.createWithdrawalAuthorizationChallenge, payload);
  }
  verifyWithdrawalAuthorizationChallenge(payload: { challengeId: string; userId: string; firebaseIdToken: string }) {
    return this.send(WALLET_MESSAGE_PATTERNS.verifyWithdrawalAuthorizationChallenge, payload);
  }
  listAdminPayoutAccounts(payload: { status?: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'DISABLED' }) {
    return this.send(WALLET_MESSAGE_PATTERNS.listAdminPayoutAccounts, payload);
  }
  verifyPayoutAccount(payload: { payoutAccountId: string; adminUserId: string; resolvedAccountHolder: string }) {
    return this.send(WALLET_MESSAGE_PATTERNS.verifyPayoutAccount, payload);
  }
  rejectPayoutAccount(payload: { payoutAccountId: string; adminUserId: string; reason: string }) {
    return this.send(WALLET_MESSAGE_PATTERNS.rejectPayoutAccount, payload);
  }
  revealPayoutAccount(payload: { payoutAccountId: string; adminUserId: string; reason: string }) {
    return this.send(WALLET_MESSAGE_PATTERNS.revealPayoutAccount, payload);
  }
  revealWithdrawalAccount(payload: { withdrawalId: string; adminUserId: string; reason: string }) {
    return this.send(WALLET_MESSAGE_PATTERNS.revealWithdrawalAccount, payload);
  }

  createWalletTopUp(payload: { userId: string; amount: string; idempotencyKey: string }) {
    return this.send(WALLET_MESSAGE_PATTERNS.createWalletTopUp, payload);
  }
  createShopWalletTopUp(payload: { shopId: string; userId: string; requesterRole: string; amount: string; idempotencyKey: string }) {
    return this.send(WALLET_MESSAGE_PATTERNS.createShopWalletTopUp, payload);
  }
  handleWalletTopUpWebhook(payload: { code: string; desc: string; success: boolean; signature: string; data: Record<string, unknown> }) {
    return this.send(WALLET_MESSAGE_PATTERNS.handleWalletTopUpWebhook, payload);
  }
  reconcileWalletTopUp(payload: { userId: string; paymentLinkId: string }) {
    return this.send(WALLET_MESSAGE_PATTERNS.reconcileWalletTopUp, payload);
  }
  getPlatformWallets() { return this.send(WALLET_MESSAGE_PATTERNS.getPlatformWallets, {}); }
  getWalletReconciliation(payload: { fromDate?: string; toDate?: string; shopId?: string; transactionType?: string; status?: string; page?: number; limit?: number }) {
    return this.send(WALLET_MESSAGE_PATTERNS.getWalletReconciliation, payload);
  }
  listAdminWalletWithdrawals(payload: { page: number; limit: number; status?: string }) {
    return this.send(WALLET_MESSAGE_PATTERNS.listAdminWalletWithdrawals, payload);
  }
  adjustWalletBalance(payload: { walletId: string; adminUserId: string; direction: 'CREDIT' | 'DEBIT'; balanceType: 'AVAILABLE' | 'PENDING' | 'LOCKED'; amount: string; reason: string }) {
    return this.send(WALLET_MESSAGE_PATTERNS.adjustWalletBalance, payload);
  }

  private async send<TResult>(pattern: string, payload: unknown): Promise<TResult> {
    try {
      return await lastValueFrom(this.catalogClient.send<TResult, unknown>(pattern, payload));
    } catch (error) {
      throwHttpExceptionFromRpc(error);
    }
  }
}

type PayoutOwnerPayload = { userId: string; requesterRole: string; shopId?: string };
type WithdrawalPayload = {
  requesterUserId: string;
  requesterRole: string;
  amount: string;
  payoutAccountId: string;
  idempotencyKey: string;
  authorizationToken: string;
};
type PayoutAccountPayload = {
  authorizationToken: string;
  verificationId: string;
};
type ChallengePayload = {
  operation: 'CREATE_PAYOUT_ACCOUNT' | 'DELETE_PAYOUT_ACCOUNT' | 'CREATE_WITHDRAWAL';
  channel: 'PHONE' | 'EMAIL';
  payoutAccountId?: string;
  amount?: string;
  bankAccountVerificationId?: string;
};
