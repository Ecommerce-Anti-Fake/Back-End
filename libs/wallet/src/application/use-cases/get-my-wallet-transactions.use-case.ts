import { Injectable } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { toWalletLedgerResponse } from '../wallet.mapper';

@Injectable()
export class GetMyWalletTransactionsUseCase {
  constructor(private readonly walletService: WalletService) {}

  async execute(userId: string, page = 1, limit = 20) {
    const wallet = await this.walletService.findOrCreateUserWallet(
      userId,
      'VND',
    );
    const result = await this.walletService.listLedger(wallet.id, page, limit);
    return toWalletLedgerResponse(result);
  }
}
