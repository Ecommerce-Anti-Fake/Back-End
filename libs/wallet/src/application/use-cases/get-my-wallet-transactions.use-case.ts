import { Injectable } from '@nestjs/common';
import { WalletService } from './wallet.service';

@Injectable()
export class GetMyWalletTransactionsUseCase {
  constructor(private readonly walletService: WalletService) {}

  async execute(userId: string, page = 1, limit = 20) {
    const wallet = await this.walletService.findOrCreateUserWallet(
      userId,
      'VND',
    );
    const result = await this.walletService.listLedger(wallet.id, page, limit);
    return {
      ...result,
      data: result.data.map((entry) => ({
        transactionCode: entry.transaction.transactionCode,
        transactionType: entry.transaction.transactionType,
        status: entry.transaction.status,
        direction: entry.direction,
        balanceType: entry.balanceType,
        amount: entry.amount.toFixed(2),
        balanceBefore: entry.balanceBefore.toFixed(2),
        balanceAfter: entry.balanceAfter.toFixed(2),
        description: entry.transaction.description,
        createdAt: entry.createdAt,
      })),
    };
  }
}
