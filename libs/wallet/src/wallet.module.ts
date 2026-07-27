import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FirebaseTokenVerifierService } from '@auth';
import { PrismaModule } from '@database/prisma/prisma.module';
import { WalletRepositoryPort } from './application/ports';
import { WalletService } from './application/use-cases';
import { WalletRepository } from './infrastructure/persistence/wallet.repository';
import {
  GetMyWalletTransactionsUseCase,
  GetMyWalletUseCase,
  GetShopWalletTransactionsUseCase,
  GetShopWalletUseCase,
  ReconcileShopWalletUseCase,
  RequestWalletWithdrawalUseCase,
  ListShopWalletWithdrawalsUseCase,
  ListUserWalletWithdrawalsUseCase,
  ListShopCodSettlementsUseCase,
  ApproveWalletWithdrawalUseCase,
  CompleteWalletWithdrawalUseCase,
  CancelWalletWithdrawalUseCase,
  RejectWalletWithdrawalUseCase,
  AdjustWalletBalanceUseCase,
  GetWalletReconciliationUseCase,
  CreateWalletTopUpUseCase,
  HandleWalletTopUpWebhookUseCase,
  ListAdminWalletWithdrawalsUseCase,
  GetPlatformWalletsUseCase,
} from './application/use-cases';
import { WalletRpcController } from './presentation/rpc/wallet.rpc-controller';
import { PayOSTopUpService } from './infrastructure/payos-top-up.service';
import { PayoutAccountSecurityService } from './domain';
import { BankAccountVerificationService, CodShopSettlementService, PayoutAccountService, WithdrawalAuthorizationService } from './application/services';
import { VietQrBankAccountLookupService } from './infrastructure/vietqr-bank-account-lookup.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [WalletRpcController],
  providers: [
    WalletRepository,
    WalletService,
    FirebaseTokenVerifierService,
    PayoutAccountSecurityService,
    WithdrawalAuthorizationService,
    PayoutAccountService,
    BankAccountVerificationService,
    CodShopSettlementService,
    VietQrBankAccountLookupService,
    GetMyWalletUseCase,
    GetMyWalletTransactionsUseCase,
    GetShopWalletUseCase,
    GetShopWalletTransactionsUseCase,
    ReconcileShopWalletUseCase,
    RequestWalletWithdrawalUseCase,
    ListShopWalletWithdrawalsUseCase,
    ListUserWalletWithdrawalsUseCase,
    ListShopCodSettlementsUseCase,
    ApproveWalletWithdrawalUseCase,
    CompleteWalletWithdrawalUseCase,
    CancelWalletWithdrawalUseCase,
    RejectWalletWithdrawalUseCase,
    AdjustWalletBalanceUseCase,
    GetWalletReconciliationUseCase,
    CreateWalletTopUpUseCase,
    HandleWalletTopUpWebhookUseCase,
    PayOSTopUpService,
    ListAdminWalletWithdrawalsUseCase,
    GetPlatformWalletsUseCase,
    { provide: WalletRepositoryPort, useExisting: WalletRepository },
  ],
  exports: [WalletRepository, WalletService, WalletRepositoryPort, CodShopSettlementService, ReconcileShopWalletUseCase, RequestWalletWithdrawalUseCase, ListShopWalletWithdrawalsUseCase, ApproveWalletWithdrawalUseCase, CompleteWalletWithdrawalUseCase, CancelWalletWithdrawalUseCase, RejectWalletWithdrawalUseCase, AdjustWalletBalanceUseCase, GetWalletReconciliationUseCase],
})
export class WalletModule {}
