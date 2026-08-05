import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, WalletBalanceType, WalletEntryDirection, WalletTransactionType } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';
import { WalletRepository } from '../../infrastructure/persistence/wallet.repository';

@Injectable()
export class CompleteWalletWithdrawalUseCase {
  constructor(private readonly prisma: PrismaService, private readonly walletRepository: WalletRepository) {}

  execute(input: { id: string; transferReference: string; adminUserId?: string }) {
    const transferReference = input.transferReference?.trim();
    if (!transferReference) throw new BadRequestException('Transfer reference is required');

    return this.prisma.$transaction(
      (tx) => this.executeInTransaction(tx, { ...input, transferReference }),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async executeInTransaction(
    tx: Prisma.TransactionClient,
    input: { id: string; transferReference: string; adminUserId?: string },
  ) {
    const withdrawal = await this.walletRepository.findWithdrawalInTransaction(tx, input.id);
    if (!withdrawal) throw new NotFoundException('Withdrawal not found');
    if (withdrawal.status !== 'PROCESSING') throw new BadRequestException('Withdrawal is not processing');

    await this.walletRepository.executeTransactionInTransaction(tx, {
      transactionCode: `WITHDRAWAL:COMPLETE:${withdrawal.id}`,
      transactionType: WalletTransactionType.WITHDRAWAL,
      idempotencyKey: `WITHDRAWAL:${withdrawal.id}:COMPLETE`,
      amount: withdrawal.amount,
      referenceType: 'WALLET_WITHDRAWAL',
      referenceId: withdrawal.id,
      description: `Complete wallet withdrawal ${withdrawal.id}`,
      allowUnbalanced: true,
      entries: [{
        walletId: withdrawal.walletId,
        direction: WalletEntryDirection.DEBIT,
        balanceType: WalletBalanceType.LOCKED,
        amount: withdrawal.amount,
      }],
    });
    const completedAt = new Date();
    await tx.walletWithdrawal.update({
      where: { id: withdrawal.id },
      data: {
        status: 'COMPLETED',
        transferReference: input.transferReference,
        completedAt,
        processedAt: completedAt,
        ...(input.adminUserId ? { processedByUserId: input.adminUserId } : {}),
      },
    });
    return { success: true, message: 'Đã ghi nhận chuyển khoản và hoàn tất yêu cầu rút tiền.' };
  }
}
