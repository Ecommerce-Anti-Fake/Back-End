import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { throwRpcException } from '@common';
import { WALLET_MESSAGE_PATTERNS } from '@contracts';
import type {
  MyWalletLookupMessage,
  ShopWalletLookupMessage,
  WalletTransactionsLookupMessage,
  ShopWalletTransactionsLookupMessage,
} from '@contracts';
import {
  GetMyWalletTransactionsUseCase,
  GetMyWalletUseCase,
  GetShopWalletTransactionsUseCase,
  GetShopWalletUseCase,
} from '../../application/use-cases';

@Controller()
export class WalletRpcController {
  constructor(
    private readonly getMyWalletUseCase: GetMyWalletUseCase,
    private readonly getMyWalletTransactionsUseCase: GetMyWalletTransactionsUseCase,
    private readonly getShopWalletUseCase: GetShopWalletUseCase,
    private readonly getShopWalletTransactionsUseCase: GetShopWalletTransactionsUseCase,
  ) {}

  @MessagePattern(WALLET_MESSAGE_PATTERNS.getMyWallet)
  async getMyWallet(@Payload() payload: MyWalletLookupMessage) {
    try {
      return await this.getMyWalletUseCase.execute(payload.userId);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(WALLET_MESSAGE_PATTERNS.getMyWalletTransactions)
  async getMyWalletTransactions(
    @Payload() payload: WalletTransactionsLookupMessage,
  ) {
    try {
      return await this.getMyWalletTransactionsUseCase.execute(
        payload.userId,
        payload.page,
        payload.limit,
      );
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(WALLET_MESSAGE_PATTERNS.getShopWallet)
  async getShopWallet(@Payload() payload: ShopWalletLookupMessage) {
    try {
      return await this.getShopWalletUseCase.execute(
        payload.shopId,
        payload.requesterUserId,
        payload.requesterRole,
      );
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(WALLET_MESSAGE_PATTERNS.getShopWalletTransactions)
  async getShopWalletTransactions(
    @Payload() payload: ShopWalletTransactionsLookupMessage,
  ) {
    try {
      return await this.getShopWalletTransactionsUseCase.execute(
        payload.shopId,
        payload.requesterUserId,
        payload.requesterRole,
        payload.page,
        payload.limit,
      );
    } catch (error) {
      throwRpcException(error);
    }
  }
}
