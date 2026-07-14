import { ForbiddenException, Injectable } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { toWalletResponse } from '../wallet.mapper';

@Injectable()
export class GetShopWalletUseCase {
  constructor(private readonly walletService: WalletService) {}

  async execute(
    shopId: string,
    requesterUserId: string,
    requesterRole: string,
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
    return toWalletResponse(
      await this.walletService.findOrCreateShopWallet(shopId, 'VND'),
    );
  }
}
