import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CATALOG_SERVICE_CLIENT, WALLET_MESSAGE_PATTERNS } from '@contracts';
import { throwHttpExceptionFromRpc } from '@common';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class WalletRpcService {
  constructor(
    @Inject(CATALOG_SERVICE_CLIENT) private readonly catalogClient: ClientProxy,
  ) {}

  getMyWallet(payload: { userId: string }) {
    return this.send(WALLET_MESSAGE_PATTERNS.getMyWallet, payload);
  }
  getMyWalletTransactions(payload: {
    userId: string;
    page: number;
    limit: number;
  }) {
    return this.send(WALLET_MESSAGE_PATTERNS.getMyWalletTransactions, payload);
  }
  getShopWallet(payload: {
    shopId: string;
    requesterUserId: string;
    requesterRole: string;
  }) {
    return this.send(WALLET_MESSAGE_PATTERNS.getShopWallet, payload);
  }
  getShopWalletTransactions(payload: {
    shopId: string;
    requesterUserId: string;
    requesterRole: string;
    page: number;
    limit: number;
  }) {
    return this.send(
      WALLET_MESSAGE_PATTERNS.getShopWalletTransactions,
      payload,
    );
  }

  requestShopWalletWithdrawal(payload: {
    shopId: string;
    requesterUserId: string;
    requesterRole: string;
    amount: string;
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  }) {
    return this.send(WALLET_MESSAGE_PATTERNS.requestShopWalletWithdrawal, payload);
  }

  listShopWalletWithdrawals(payload: {
    shopId: string;
    requesterUserId: string;
    requesterRole: string;
  }) {
    return this.send(WALLET_MESSAGE_PATTERNS.listShopWalletWithdrawals, payload);
  }

  approveWalletWithdrawal(payload: { id: string }) {
    return this.send(WALLET_MESSAGE_PATTERNS.approveWalletWithdrawal, payload);
  }

  rejectWalletWithdrawal(payload: { id: string }) {
    return this.send(WALLET_MESSAGE_PATTERNS.rejectWalletWithdrawal, payload);
  }

  createWalletTopUp(payload: { userId: string; amount: string; idempotencyKey: string }) {
    return this.send(WALLET_MESSAGE_PATTERNS.createWalletTopUp, payload);
  }

  handleWalletTopUpWebhook(payload: { code: string; desc: string; success: boolean; signature: string; data: Record<string, unknown> }) {
    return this.send(WALLET_MESSAGE_PATTERNS.handleWalletTopUpWebhook, payload);
  }

  getPlatformWallets() {
    return this.send(WALLET_MESSAGE_PATTERNS.getPlatformWallets, {});
  }

  getWalletReconciliation(payload: { fromDate?: string; toDate?: string; shopId?: string; transactionType?: string; status?: string; page?: number; limit?: number }) {
    return this.send(WALLET_MESSAGE_PATTERNS.getWalletReconciliation, payload);
  }

  listAdminWalletWithdrawals(payload: { page: number; limit: number; status?: string }) {
    return this.send(WALLET_MESSAGE_PATTERNS.listAdminWalletWithdrawals, payload);
  }

  adjustWalletBalance(payload: { walletId: string; adminUserId: string; direction: 'CREDIT' | 'DEBIT'; balanceType: 'AVAILABLE' | 'PENDING' | 'LOCKED'; amount: string; reason: string }) {
    return this.send(WALLET_MESSAGE_PATTERNS.adjustWalletBalance, payload);
  }

  private async send<TResult>(
    pattern: string,
    payload: unknown,
  ): Promise<TResult> {
    try {
      return await lastValueFrom(
        this.catalogClient.send<TResult, unknown>(pattern, payload),
      );
    } catch (error) {
      throwHttpExceptionFromRpc(error);
    }
  }
}
