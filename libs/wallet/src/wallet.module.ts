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
} from './application/use-cases';
import { WalletRpcController } from './presentation/rpc/wallet.rpc-controller';

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
    { provide: WalletRepositoryPort, useExisting: WalletRepository },
  ],
  exports: [WalletRepository, WalletService, WalletRepositoryPort, ReconcileShopWalletUseCase],
})
export class WalletModule {}
