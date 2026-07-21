import { Injectable } from '@nestjs/common';
import { WalletRepository } from '../../infrastructure/persistence/wallet.repository';
import { toWalletLedgerResponse } from '../wallet.mapper';

@Injectable()
export class GetPlatformWalletsUseCase {
  constructor(private readonly repository: WalletRepository) {}
  async execute() {
    const wallets = await this.repository.listPlatformWallets();
    return wallets.map((item) => ({ ...item, ledger: toWalletLedgerResponse(item.ledger) }));
  }
}
