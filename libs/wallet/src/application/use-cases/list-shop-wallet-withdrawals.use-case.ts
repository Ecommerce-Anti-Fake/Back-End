import { ForbiddenException, Injectable } from '@nestjs/common';
import { WalletRepository } from '../../infrastructure/persistence/wallet.repository';
import { WalletService } from './wallet.service';

@Injectable()
export class ListShopWalletWithdrawalsUseCase {
  constructor(
    private readonly walletService: WalletService,
    private readonly walletRepository: WalletRepository,
  ) {}

  async execute(input: { shopId: string; requesterUserId: string; requesterRole: string }) {
    if (!(await this.walletService.canAccessShopWallet(input.shopId, input.requesterUserId, input.requesterRole))) {
      throw new ForbiddenException('Bạn không có quyền xem ví của shop này.');
    }
    const wallet = await this.walletRepository.findShopWallet(input.shopId, 'VND');
    if (!wallet) return [];
    const withdrawals = await this.walletRepository.listWithdrawals(wallet.id);
    return withdrawals.map((withdrawal) => ({
      id: withdrawal.id,
      amount: withdrawal.amount.toFixed(2),
      bankName: withdrawal.bankName,
      accountNumber: withdrawal.accountNumber,
      accountHolder: withdrawal.accountHolder,
      status: withdrawal.status,
      createdAt: withdrawal.createdAt,
      processedAt: withdrawal.processedAt,
    }));
  }
}
