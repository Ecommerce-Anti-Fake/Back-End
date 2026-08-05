import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';
import { WalletRepository } from '../../infrastructure/persistence/wallet.repository';

@Injectable()
export class ApproveWalletWithdrawalUseCase {
  constructor(private readonly prisma: PrismaService, private readonly walletRepository: WalletRepository) {}

  execute(input: { id: string; adminUserId?: string }) {
    return this.prisma.$transaction((tx) => this.executeInTransaction(tx, input), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  async executeInTransaction(tx: Prisma.TransactionClient, input: { id: string; adminUserId?: string }) {
    const withdrawal = await this.walletRepository.findWithdrawalInTransaction(tx, input.id);
    if (!withdrawal) throw new NotFoundException('Withdrawal not found');
    if (withdrawal.status !== 'PENDING') throw new BadRequestException('Withdrawal is not pending');

    await tx.walletWithdrawal.update({
      where: { id: withdrawal.id },
      data: {
        status: 'PROCESSING',
        approvedAt: new Date(),
        ...(input.adminUserId ? { processedByUserId: input.adminUserId } : {}),
      },
    });
    return { success: true, message: 'Đã duyệt yêu cầu rút tiền.' };
  }
}
