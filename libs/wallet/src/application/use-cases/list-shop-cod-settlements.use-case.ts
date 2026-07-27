import { ForbiddenException, Injectable } from '@nestjs/common';
import { CodShopSettlementService } from '../services';
import { WalletService } from './wallet.service';

@Injectable()
export class ListShopCodSettlementsUseCase {
  constructor(
    private readonly walletService: WalletService,
    private readonly codShopSettlementService: CodShopSettlementService,
  ) {}

  async execute(input: {
    shopId: string;
    requesterUserId: string;
    requesterRole: string;
  }) {
    if (
      !(await this.walletService.canAccessShopWallet(
        input.shopId,
        input.requesterUserId,
        input.requesterRole,
      ))
    ) {
      throw new ForbiddenException('You cannot access this shop wallet');
    }
    return this.codShopSettlementService.listShop(input.shopId);
  }
}
