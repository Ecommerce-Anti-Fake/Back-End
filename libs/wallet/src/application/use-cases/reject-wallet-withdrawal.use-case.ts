import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, WalletBalanceType, WalletEntryDirection, WalletTransactionType } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';
import { WalletRepository } from '../../infrastructure/persistence/wallet.repository';

@Injectable()
export class RejectWalletWithdrawalUseCase {
  constructor(private readonly prisma: PrismaService, private readonly walletRepository: WalletRepository) {}

  execute(input: { id: string }) {
    return this.prisma.$transaction((tx) => this.executeInTransaction(tx, input), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  async executeInTransaction(tx: Prisma.TransactionClient, input: { id: string }) {
    const withdrawal = await this.walletRepository.findWithdrawalInTransaction(tx, input.id);
    if (!withdrawal) throw new NotFoundException('Withdrawal not found');
    if (withdrawal.status !== 'PENDING') throw new BadRequestException('Withdrawal is not pending');

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
    await tx.walletWithdrawal.update({
      where: { id: withdrawal.id },
      data: { status: 'REJECTED', processedAt: new Date() },
    });
    return { success: true, message: 'Xử lý yêu cầu rút tiền thành công.' };
  }
}
