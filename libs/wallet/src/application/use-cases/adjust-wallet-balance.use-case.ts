import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, WalletBalanceType, WalletEntryDirection, WalletTransactionType } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';
import { WalletRepository } from '../../infrastructure/persistence/wallet.repository';

@Injectable()
export class AdjustWalletBalanceUseCase {
  constructor(private readonly prisma: PrismaService, private readonly walletRepository: WalletRepository) {}

  execute(input: { walletId: string; adminUserId: string; direction: 'CREDIT' | 'DEBIT'; balanceType: 'AVAILABLE' | 'PENDING' | 'LOCKED'; amount: string; reason: string }) {
    const amount = new Prisma.Decimal(input.amount);
    if (amount.lte(0)) throw new BadRequestException('Amount must be greater than zero');
    const reason = input.reason.trim();
    if (!reason) throw new BadRequestException('Reason is required');
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { id: input.walletId } });
      if (!wallet) throw new NotFoundException('Wallet not found');
      const transaction = await this.walletRepository.executeTransactionInTransaction(tx, {
        transactionCode: `ADJUSTMENT:${wallet.id}:${Date.now()}`,
        transactionType: WalletTransactionType.ADJUSTMENT,
        idempotencyKey: `WALLET:${wallet.id}:ADJUSTMENT:${input.adminUserId}:${Date.now()}`,
        amount, referenceType: 'WALLET', referenceId: wallet.id, description: reason,
        allowUnbalanced: true,
        entries: [{ walletId: wallet.id, direction: WalletEntryDirection[input.direction], balanceType: WalletBalanceType[input.balanceType], amount }],
      });
      await tx.auditLog.create({ data: { targetType: 'WALLET', targetId: wallet.id, actorUserId: input.adminUserId, action: 'WALLET_BALANCE_ADJUSTED', note: reason, metadata: { walletId: wallet.id, amount: amount.toFixed(2), direction: input.direction, balanceType: input.balanceType, transactionId: transaction.id } } });
      return { success: true, message: 'Điều chỉnh số dư ví thành công.' };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
