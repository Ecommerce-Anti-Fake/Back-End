import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { throwRpcException } from '@common';
import { WALLET_MESSAGE_PATTERNS } from '@contracts';
import type {
  MyWalletLookupMessage,
  ShopWalletLookupMessage,
  WalletTransactionsLookupMessage,
  ShopWalletTransactionsLookupMessage,
  ShopWalletWithdrawalMessage,
  WalletWithdrawalActionMessage,
} from '@contracts';
import {
  GetMyWalletTransactionsUseCase,
  GetMyWalletUseCase,
  GetShopWalletTransactionsUseCase,
  GetShopWalletUseCase,
  RequestWalletWithdrawalUseCase,
  ListShopWalletWithdrawalsUseCase,
  ApproveWalletWithdrawalUseCase,
  RejectWalletWithdrawalUseCase,
} from '../../application/use-cases';

@Controller()
export class WalletRpcController {
  constructor(
    private readonly getMyWalletUseCase: GetMyWalletUseCase,
    private readonly getMyWalletTransactionsUseCase: GetMyWalletTransactionsUseCase,
    private readonly getShopWalletUseCase: GetShopWalletUseCase,
    private readonly getShopWalletTransactionsUseCase: GetShopWalletTransactionsUseCase,
    private readonly requestWalletWithdrawalUseCase: RequestWalletWithdrawalUseCase,
    private readonly listShopWalletWithdrawalsUseCase: ListShopWalletWithdrawalsUseCase,
    private readonly approveWalletWithdrawalUseCase: ApproveWalletWithdrawalUseCase,
    private readonly rejectWalletWithdrawalUseCase: RejectWalletWithdrawalUseCase,
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

  @MessagePattern(WALLET_MESSAGE_PATTERNS.requestShopWalletWithdrawal)
  async requestShopWalletWithdrawal(@Payload() payload: ShopWalletWithdrawalMessage) {
    try {
      return await this.requestWalletWithdrawalUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(WALLET_MESSAGE_PATTERNS.listShopWalletWithdrawals)
  async listShopWalletWithdrawals(@Payload() payload: ShopWalletLookupMessage) {
    try {
      return await this.listShopWalletWithdrawalsUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(WALLET_MESSAGE_PATTERNS.approveWalletWithdrawal)
  async approveWalletWithdrawal(@Payload() payload: WalletWithdrawalActionMessage) {
    try {
      return await this.approveWalletWithdrawalUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(WALLET_MESSAGE_PATTERNS.rejectWalletWithdrawal)
  async rejectWalletWithdrawal(@Payload() payload: WalletWithdrawalActionMessage) {
    try {
      return await this.rejectWalletWithdrawalUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }
}
