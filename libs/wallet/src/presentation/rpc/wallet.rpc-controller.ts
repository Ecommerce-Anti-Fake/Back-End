import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { throwRpcException } from '@common';
import { WALLET_MESSAGE_PATTERNS } from '@contracts';
import type {
  MyWalletLookupMessage,
  PayoutAccountCreateMessage,
  PayoutAccountDisableMessage,
  PayoutAccountOwnerMessage,
  ShopWalletLookupMessage,
  ShopWalletTransactionsLookupMessage,
  ShopWalletWithdrawalMessage,
  WalletTopUpCreateMessage,
  WalletTopUpWebhookMessage,
  WalletTransactionsLookupMessage,
  WalletWithdrawalActionMessage,
  WalletWithdrawalMessage,
  WithdrawalAuthorizationChallengeMessage,
  WithdrawalAuthorizationVerifyMessage,
} from '@contracts';
import {
  AdjustWalletBalanceUseCase,
  ApproveWalletWithdrawalUseCase,
  CancelWalletWithdrawalUseCase,
  CompleteWalletWithdrawalUseCase,
  CreateWalletTopUpUseCase,
  GetMyWalletTransactionsUseCase,
  GetMyWalletUseCase,
  GetPlatformWalletsUseCase,
  GetShopWalletTransactionsUseCase,
  GetShopWalletUseCase,
  GetWalletReconciliationUseCase,
  HandleWalletTopUpWebhookUseCase,
  ListAdminWalletWithdrawalsUseCase,
  ListShopWalletWithdrawalsUseCase,
  RejectWalletWithdrawalUseCase,
  RequestWalletWithdrawalUseCase,
} from '../../application/use-cases';
import { PayoutAccountService, WithdrawalAuthorizationService } from '../../application/services';

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
    private readonly cancelWalletWithdrawalUseCase: CancelWalletWithdrawalUseCase,
    private readonly completeWalletWithdrawalUseCase: CompleteWalletWithdrawalUseCase,
    private readonly rejectWalletWithdrawalUseCase: RejectWalletWithdrawalUseCase,
    private readonly payoutAccountService: PayoutAccountService,
    private readonly withdrawalAuthorizationService: WithdrawalAuthorizationService,
    private readonly adjustWalletBalanceUseCase: AdjustWalletBalanceUseCase,
    private readonly getWalletReconciliationUseCase: GetWalletReconciliationUseCase,
    private readonly createWalletTopUpUseCase: CreateWalletTopUpUseCase,
    private readonly handleWalletTopUpWebhookUseCase: HandleWalletTopUpWebhookUseCase,
    private readonly listAdminWalletWithdrawalsUseCase: ListAdminWalletWithdrawalsUseCase,
    private readonly getPlatformWalletsUseCase: GetPlatformWalletsUseCase,
  ) {}

  @MessagePattern(WALLET_MESSAGE_PATTERNS.getMyWallet)
  async getMyWallet(@Payload() payload: MyWalletLookupMessage) {
    return this.run(() => this.getMyWalletUseCase.execute(payload.userId));
  }

  @MessagePattern(WALLET_MESSAGE_PATTERNS.getMyWalletTransactions)
  async getMyWalletTransactions(@Payload() payload: WalletTransactionsLookupMessage) {
    return this.run(() => this.getMyWalletTransactionsUseCase.execute(payload.userId, payload.page, payload.limit));
  }

  @MessagePattern(WALLET_MESSAGE_PATTERNS.getShopWallet)
  async getShopWallet(@Payload() payload: ShopWalletLookupMessage) {
    return this.run(() => this.getShopWalletUseCase.execute(payload.shopId, payload.requesterUserId, payload.requesterRole));
  }

  @MessagePattern(WALLET_MESSAGE_PATTERNS.getShopWalletTransactions)
  async getShopWalletTransactions(@Payload() payload: ShopWalletTransactionsLookupMessage) {
    return this.run(() => this.getShopWalletTransactionsUseCase.execute(
      payload.shopId, payload.requesterUserId, payload.requesterRole, payload.page, payload.limit,
    ));
  }

  @MessagePattern(WALLET_MESSAGE_PATTERNS.requestShopWalletWithdrawal)
  async requestShopWalletWithdrawal(@Payload() payload: ShopWalletWithdrawalMessage) {
    return this.run(() => this.requestWalletWithdrawalUseCase.execute(payload));
  }

  @MessagePattern(WALLET_MESSAGE_PATTERNS.requestUserWalletWithdrawal)
  async requestUserWalletWithdrawal(@Payload() payload: WalletWithdrawalMessage) {
    return this.run(() => this.requestWalletWithdrawalUseCase.execute(payload));
  }

  @MessagePattern(WALLET_MESSAGE_PATTERNS.listShopWalletWithdrawals)
  async listShopWalletWithdrawals(@Payload() payload: ShopWalletLookupMessage) {
    return this.run(() => this.listShopWalletWithdrawalsUseCase.execute(payload));
  }

  @MessagePattern(WALLET_MESSAGE_PATTERNS.approveWalletWithdrawal)
  async approveWalletWithdrawal(@Payload() payload: WalletWithdrawalActionMessage) {
    return this.run(() => this.approveWalletWithdrawalUseCase.execute(payload));
  }

  @MessagePattern(WALLET_MESSAGE_PATTERNS.completeWalletWithdrawal)
  async completeWalletWithdrawal(@Payload() payload: WalletWithdrawalActionMessage) {
    return this.run(() => this.completeWalletWithdrawalUseCase.execute({
      id: payload.id, adminUserId: payload.adminUserId, transferReference: payload.transferReference ?? '',
    }));
  }

  @MessagePattern(WALLET_MESSAGE_PATTERNS.cancelWalletWithdrawal)
  async cancelWalletWithdrawal(@Payload() payload: { id: string; shopId?: string; requesterUserId: string; requesterRole: string }) {
    return this.run(() => this.cancelWalletWithdrawalUseCase.execute(payload));
  }

  @MessagePattern(WALLET_MESSAGE_PATTERNS.rejectWalletWithdrawal)
  async rejectWalletWithdrawal(@Payload() payload: WalletWithdrawalActionMessage) {
    return this.run(() => this.rejectWalletWithdrawalUseCase.execute({
      id: payload.id, adminUserId: payload.adminUserId, reason: payload.reason ?? '',
    }));
  }

  @MessagePattern(WALLET_MESSAGE_PATTERNS.createPayoutAccount)
  async createPayoutAccount(@Payload() payload: PayoutAccountCreateMessage) {
    return this.run(() => this.payoutAccountService.create(payload));
  }

  @MessagePattern(WALLET_MESSAGE_PATTERNS.listPayoutAccounts)
  async listPayoutAccounts(@Payload() payload: PayoutAccountOwnerMessage) {
    return this.run(() => this.payoutAccountService.list(payload));
  }

  @MessagePattern(WALLET_MESSAGE_PATTERNS.disablePayoutAccount)
  async disablePayoutAccount(@Payload() payload: PayoutAccountDisableMessage) {
    return this.run(() => this.payoutAccountService.disable(payload));
  }

  @MessagePattern(WALLET_MESSAGE_PATTERNS.createWithdrawalAuthorizationChallenge)
  async createWithdrawalAuthorizationChallenge(@Payload() payload: WithdrawalAuthorizationChallengeMessage) {
    return this.run(() => this.withdrawalAuthorizationService.createChallenge(payload));
  }

  @MessagePattern(WALLET_MESSAGE_PATTERNS.verifyWithdrawalAuthorizationChallenge)
  async verifyWithdrawalAuthorizationChallenge(@Payload() payload: WithdrawalAuthorizationVerifyMessage) {
    return this.run(() => this.withdrawalAuthorizationService.verifyChallenge(payload));
  }

  @MessagePattern(WALLET_MESSAGE_PATTERNS.listAdminPayoutAccounts)
  async listAdminPayoutAccounts(@Payload() payload: { status?: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'DISABLED' }) {
    return this.run(() => this.payoutAccountService.listForAdmin(payload.status));
  }

  @MessagePattern(WALLET_MESSAGE_PATTERNS.verifyPayoutAccount)
  async verifyPayoutAccount(@Payload() payload: { payoutAccountId: string; adminUserId: string; resolvedAccountHolder: string }) {
    return this.run(() => this.payoutAccountService.verifyManually(payload));
  }

  @MessagePattern(WALLET_MESSAGE_PATTERNS.rejectPayoutAccount)
  async rejectPayoutAccount(@Payload() payload: { payoutAccountId: string; adminUserId: string; reason: string }) {
    return this.run(() => this.payoutAccountService.rejectManually(payload));
  }

  @MessagePattern(WALLET_MESSAGE_PATTERNS.revealPayoutAccount)
  async revealPayoutAccount(@Payload() payload: { payoutAccountId: string; adminUserId: string; reason: string }) {
    return this.run(() => this.payoutAccountService.revealForAdmin(payload));
  }

  @MessagePattern(WALLET_MESSAGE_PATTERNS.revealWithdrawalAccount)
  async revealWithdrawalAccount(@Payload() payload: { withdrawalId: string; adminUserId: string; reason: string }) {
    return this.run(() => this.payoutAccountService.revealWithdrawalForAdmin(payload));
  }

  @MessagePattern(WALLET_MESSAGE_PATTERNS.adjustWalletBalance)
  async adjustWalletBalance(@Payload() payload: any) {
    return this.run(() => this.adjustWalletBalanceUseCase.execute(payload));
  }

  @MessagePattern(WALLET_MESSAGE_PATTERNS.createWalletTopUp)
  async createWalletTopUp(@Payload() payload: WalletTopUpCreateMessage) {
    return this.run(() => this.createWalletTopUpUseCase.execute(payload));
  }

  @MessagePattern(WALLET_MESSAGE_PATTERNS.handleWalletTopUpWebhook)
  async handleWalletTopUpWebhook(@Payload() payload: WalletTopUpWebhookMessage) {
    return this.run(() => this.handleWalletTopUpWebhookUseCase.execute(payload));
  }

  @MessagePattern(WALLET_MESSAGE_PATTERNS.getWalletReconciliation)
  async getWalletReconciliation(@Payload() payload: { fromDate?: string; toDate?: string; shopId?: string; transactionType?: string; status?: string; page?: number; limit?: number }) {
    return this.run(() => this.getWalletReconciliationUseCase.execute(payload));
  }

  @MessagePattern(WALLET_MESSAGE_PATTERNS.getPlatformWallets)
  async getPlatformWallets() {
    return this.run(() => this.getPlatformWalletsUseCase.execute());
  }

  @MessagePattern(WALLET_MESSAGE_PATTERNS.listAdminWalletWithdrawals)
  async listAdminWalletWithdrawals(@Payload() payload: { page?: number; limit?: number; status?: string }) {
    return this.run(() => this.listAdminWalletWithdrawalsUseCase.execute(payload));
  }

  private async run<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throwRpcException(error);
    }
  }
}
