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
