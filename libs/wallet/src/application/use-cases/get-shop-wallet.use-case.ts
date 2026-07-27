import { ForbiddenException, Injectable } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { toWalletResponse } from '../wallet.mapper';
import { CodShopSettlementService } from '../services';
import { Prisma } from '@prisma/client';

@Injectable()
export class GetShopWalletUseCase {
  constructor(
    private readonly walletService: WalletService,
    private readonly codShopSettlementService: CodShopSettlementService,
  ) {}

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
    const [wallet, codSummary] = await Promise.all([
      this.walletService.findOrCreateShopWallet(shopId, 'VND'),
      this.codShopSettlementService.getShopSummary(shopId),
    ]);
    return {
      ...toWalletResponse(wallet),
      ...codSummary,
      requiredTopUpAmount: Prisma.Decimal.max(
        new Prisma.Decimal(0),
        new Prisma.Decimal(codSummary.codAmountDue).minus(wallet.availableBalance),
      ).toFixed(2),
    };
  }
}
