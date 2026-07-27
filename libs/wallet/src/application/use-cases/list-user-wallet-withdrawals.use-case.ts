import { Injectable } from '@nestjs/common';
import { WalletRepository } from '../../infrastructure/persistence/wallet.repository';

@Injectable()
export class ListUserWalletWithdrawalsUseCase {
  constructor(private readonly walletRepository: WalletRepository) {}

  async execute(input: { userId: string }) {
    const wallet = await this.walletRepository.findUserWallet(input.userId, 'VND');
    if (!wallet) return [];
    const withdrawals = await this.walletRepository.listWithdrawals(wallet.id);
    return withdrawals.map((withdrawal) => ({
      id: withdrawal.id,
      amount: withdrawal.amount.toFixed(2),
      fee: '0.00',
      payoutAccountId: withdrawal.payoutAccountId,
      bankName: withdrawal.bankName,
      accountNumberMasked: withdrawal.accountNumberLast4
        ? `${'*'.repeat(Math.max(0, (withdrawal.accountNumberLength ?? 8) - 4))}${withdrawal.accountNumberLast4}`
        : withdrawal.accountNumber
          ? `${'*'.repeat(Math.max(0, withdrawal.accountNumber.length - 4))}${withdrawal.accountNumber.slice(-4)}`
          : null,
      accountHolder: withdrawal.accountHolder,
      status: withdrawal.status,
      transferReference: withdrawal.transferReference,
      rejectionReason: withdrawal.rejectionReason,
      createdAt: withdrawal.createdAt,
      processedAt: withdrawal.processedAt,
    }));
  }
}
