import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, WalletBalanceType, WalletEntryDirection, WalletTransactionType } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';
import { WalletRepository } from '../../infrastructure/persistence/wallet.repository';
import { WalletService } from './wallet.service';

export interface RequestWalletWithdrawalInput {
  shopId: string;
  requesterUserId: string;
  requesterRole: string;
  amount: string | number | Prisma.Decimal;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

@Injectable()
export class RequestWalletWithdrawalUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly walletRepository: WalletRepository,
  ) {}

  async execute(input: RequestWalletWithdrawalInput) {
    if (!(await this.walletService.canAccessShopWallet(input.shopId, input.requesterUserId, input.requesterRole))) {
      throw new ForbiddenException('You cannot access this shop wallet');
    }

    return this.prisma.$transaction(
      (tx) => this.executeInTransaction(tx, input),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async executeInTransaction(tx: Prisma.TransactionClient, input: RequestWalletWithdrawalInput) {
    const wallet = await this.walletRepository.findShopWalletInTransaction(tx, input.shopId, 'VND');
    if (!wallet) throw new NotFoundException('Shop wallet not found');

    const amount = new Prisma.Decimal(input.amount);
    if (amount.lessThanOrEqualTo(0)) throw new BadRequestException('Withdrawal amount must be greater than zero');
    if (amount.greaterThan(wallet.availableBalance)) throw new BadRequestException('Insufficient available balance');

    const withdrawal = await tx.walletWithdrawal.create({
      data: {
        walletId: wallet.id,
        amount,
        bankName: input.bankName.trim(),
        accountNumber: input.accountNumber.trim(),
        accountHolder: input.accountHolder.trim(),
        status: 'PENDING',
      },
    });

    await this.walletRepository.executeTransactionInTransaction(tx, {
      transactionCode: `WITHDRAWAL_REQUEST:${withdrawal.id}`,
      transactionType: WalletTransactionType.WITHDRAWAL_REQUEST,
      idempotencyKey: `WITHDRAWAL:${withdrawal.id}:REQUEST`,
      amount,
      referenceType: 'WALLET_WITHDRAWAL',
      referenceId: withdrawal.id,
      description: `Lock funds for wallet withdrawal ${withdrawal.id}`,
      entries: [
        { walletId: wallet.id, direction: WalletEntryDirection.DEBIT, balanceType: WalletBalanceType.AVAILABLE, amount },
        { walletId: wallet.id, direction: WalletEntryDirection.CREDIT, balanceType: WalletBalanceType.LOCKED, amount },
      ],
    });

    return this.toResponse(withdrawal);
  }

  private toResponse(withdrawal: { id: string; walletId: string; amount: Prisma.Decimal; bankName: string; accountNumber: string; accountHolder: string; status: string; createdAt: Date; processedAt: Date | null }) {
    return {
      id: withdrawal.id,
      amount: withdrawal.amount.toFixed(2),
      bankName: withdrawal.bankName,
      accountNumber: withdrawal.accountNumber,
      accountHolder: withdrawal.accountHolder,
      status: withdrawal.status,
      createdAt: withdrawal.createdAt,
      processedAt: withdrawal.processedAt,
    };
  }
}
