import { Module } from '@nestjs/common';
import { PrismaModule } from '@database/prisma/prisma.module';
import { WalletRepositoryPort } from './application/ports';
import { WalletService } from './application/use-cases';
import { WalletRepository } from './infrastructure/persistence/wallet.repository';

@Module({
  imports: [PrismaModule],
  providers: [
    WalletRepository,
    WalletService,
    { provide: WalletRepositoryPort, useExisting: WalletRepository },
  ],
  exports: [WalletRepository, WalletService, WalletRepositoryPort],
})
export class WalletModule {}
