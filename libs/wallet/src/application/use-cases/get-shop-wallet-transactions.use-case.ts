import { ForbiddenException, Injectable } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { toWalletLedgerResponse } from '../wallet.mapper';

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
      throw new ForbiddenException('Bạn không có quyền xem ví của shop này.');
    }
    const wallet = await this.walletService.findOrCreateShopWallet(
      shopId,
      'VND',
    );
    const result = await this.walletService.listLedger(wallet.id, page, limit);
    return toWalletLedgerResponse(result);
  }
}
