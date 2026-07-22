import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, WalletBalanceType, WalletEntryDirection, WalletTransactionType } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';
import { WalletRepository } from '../../infrastructure/persistence/wallet.repository';

@Injectable()
export class RejectWalletWithdrawalUseCase {
  constructor(private readonly prisma: PrismaService, private readonly walletRepository: WalletRepository) {}

  execute(input: { id: string; reason: string; adminUserId?: string }) {
    const reason = input.reason?.trim();
    if (!reason) throw new BadRequestException('Rejection reason is required');

    return this.prisma.$transaction(
      (tx) => this.executeInTransaction(tx, { ...input, reason }),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async executeInTransaction(
    tx: Prisma.TransactionClient,
    input: { id: string; reason: string; adminUserId?: string },
  ) {
    const withdrawal = await this.walletRepository.findWithdrawalInTransaction(tx, input.id);
    if (!withdrawal) throw new NotFoundException('Withdrawal not found');
    if (!['PENDING', 'APPROVED'].includes(withdrawal.status)) {
      throw new BadRequestException('Withdrawal can no longer be rejected');
    }

    await this.walletRepository.executeTransactionInTransaction(tx, {
      transactionCode: `WITHDRAWAL:REJECT:${withdrawal.id}`,
      transactionType: WalletTransactionType.WITHDRAWAL,
      idempotencyKey: `WITHDRAWAL:${withdrawal.id}:REJECT`,
      amount: withdrawal.amount,
      referenceType: 'WALLET_WITHDRAWAL',
      referenceId: withdrawal.id,
      description: `Reject wallet withdrawal ${withdrawal.id}`,
      entries: [
        { walletId: withdrawal.walletId, direction: WalletEntryDirection.DEBIT, balanceType: WalletBalanceType.LOCKED, amount: withdrawal.amount },
        { walletId: withdrawal.walletId, direction: WalletEntryDirection.CREDIT, balanceType: WalletBalanceType.AVAILABLE, amount: withdrawal.amount },
      ],
    });
    const processedAt = new Date();
    await tx.walletWithdrawal.update({
      where: { id: withdrawal.id },
      data: {
        status: 'REJECTED',
        rejectionReason: input.reason,
        processedAt,
        ...(input.adminUserId ? { processedByUserId: input.adminUserId } : {}),
      },
    });
    return { success: true, message: 'Đã từ chối yêu cầu rút tiền và hoàn lại số dư khả dụng.' };
  }
}
