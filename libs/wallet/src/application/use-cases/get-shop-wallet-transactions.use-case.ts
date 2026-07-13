import { ForbiddenException, Injectable } from '@nestjs/common';
import { WalletService } from './wallet.service';

@Injectable()
export class GetShopWalletTransactionsUseCase {
  constructor(private readonly walletService: WalletService) {}

  async execute(
    shopId: string,
    requesterUserId: string,
    requesterRole: string,
    page = 1,
    limit = 20,
  ) {
    if (
      !(await this.walletService.canAccessShopWallet(
        shopId,
        requesterUserId,
        requesterRole,
      ))
    ) {
      throw new ForbiddenException('Shop wallet access denied');
    }
    const wallet = await this.walletService.findOrCreateShopWallet(
      shopId,
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
