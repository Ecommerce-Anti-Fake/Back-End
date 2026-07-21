import { Module } from '@nestjs/common';
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
  ApproveWalletWithdrawalUseCase,
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

@Module({
  imports: [PrismaModule],
  controllers: [WalletRpcController],
  providers: [
    WalletRepository,
    WalletService,
    GetMyWalletUseCase,
    GetMyWalletTransactionsUseCase,
    GetShopWalletUseCase,
    GetShopWalletTransactionsUseCase,
    ReconcileShopWalletUseCase,
    RequestWalletWithdrawalUseCase,
    ListShopWalletWithdrawalsUseCase,
    ApproveWalletWithdrawalUseCase,
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
  exports: [WalletRepository, WalletService, WalletRepositoryPort, ReconcileShopWalletUseCase, RequestWalletWithdrawalUseCase, ListShopWalletWithdrawalsUseCase, ApproveWalletWithdrawalUseCase, RejectWalletWithdrawalUseCase, AdjustWalletBalanceUseCase, GetWalletReconciliationUseCase],
})
export class WalletModule {}
