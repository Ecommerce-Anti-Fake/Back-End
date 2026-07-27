import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, WalletBalanceType, WalletEntryDirection, WalletTransactionType } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';
import { WalletRepository } from '../../infrastructure/persistence/wallet.repository';
import { WalletService } from './wallet.service';

@Injectable()
export class CancelWalletWithdrawalUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly walletRepository: WalletRepository,
  ) {}

  async execute(input: { id: string; shopId?: string; requesterUserId: string; requesterRole: string }) {
    if (input.shopId && !(await this.walletService.canAccessShopWallet(
      input.shopId, input.requesterUserId, input.requesterRole,
    ))) {
      throw new ForbiddenException('You cannot access this shop wallet');
    }
    return this.prisma.$transaction((tx) => this.executeInTransaction(tx, input), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  private async executeInTransaction(
    tx: Prisma.TransactionClient,
    input: { id: string; shopId?: string; requesterUserId: string; requesterRole: string },
  ) {
    const withdrawal = await this.walletRepository.findWithdrawalInTransaction(tx, input.id);
    if (!withdrawal) throw new NotFoundException('Withdrawal not found');
    if (input.shopId) {
      const shopWallet = await this.walletRepository.findShopWalletInTransaction(
        tx,
        input.shopId,
        'VND',
      );
      if (!shopWallet || shopWallet.id !== withdrawal.walletId) {
        throw new ForbiddenException('Withdrawal does not belong to this shop wallet');
      }
    }
    if (!input.shopId && withdrawal.requestedByUserId !== input.requesterUserId) {
      throw new ForbiddenException('Withdrawal does not belong to the current user');
    }
    if (withdrawal.status !== 'PENDING') throw new BadRequestException('Only pending withdrawals can be cancelled');

    await this.walletRepository.executeTransactionInTransaction(tx, {
      transactionCode: `WITHDRAWAL:CANCEL:${withdrawal.id}`,
      transactionType: WalletTransactionType.WITHDRAWAL,
      idempotencyKey: `WITHDRAWAL:${withdrawal.id}:CANCEL`,
      amount: withdrawal.amount,
      referenceType: 'WALLET_WITHDRAWAL',
      referenceId: withdrawal.id,
      description: `Cancel wallet withdrawal ${withdrawal.id}`,
      entries: [
        { walletId: withdrawal.walletId, direction: WalletEntryDirection.DEBIT, balanceType: WalletBalanceType.LOCKED, amount: withdrawal.amount },
        { walletId: withdrawal.walletId, direction: WalletEntryDirection.CREDIT, balanceType: WalletBalanceType.AVAILABLE, amount: withdrawal.amount },
      ],
    });
    const cancelledAt = new Date();
    await tx.walletWithdrawal.update({
      where: { id: withdrawal.id },
      data: { status: 'CANCELLED', cancelledAt, processedAt: cancelledAt },
    });
    return { success: true, message: 'Đã hủy yêu cầu rút tiền và hoàn lại số dư khả dụng.' };
  }
}
