import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, WalletBalanceType, WalletEntryDirection, WalletTransactionType } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';
import { WalletRepository } from '../../infrastructure/persistence/wallet.repository';

@Injectable()
export class ReconcileShopWalletUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletRepository: WalletRepository,
  ) {}

  execute(input: { shopId: string; amount?: Prisma.Decimal | number }) {
    return this.prisma.$transaction(
      (tx) => this.executeInTransaction(tx, input),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async executeInTransaction(
    tx: Prisma.TransactionClient,
    input: { shopId: string; amount?: Prisma.Decimal | number },
  ) {
    const wallet = await this.walletRepository.findShopWalletInTransaction(tx, input.shopId, 'VND');
    if (!wallet) throw new NotFoundException('Shop wallet not found');

    const pendingBalance = new Prisma.Decimal(wallet.pendingBalance);
    const amount = input.amount === undefined ? pendingBalance : new Prisma.Decimal(input.amount);
    if (amount.lessThanOrEqualTo(0)) {
      throw new BadRequestException('Settlement amount must be greater than zero');
    }
    if (amount.greaterThan(pendingBalance)) {
      throw new BadRequestException('Settlement amount exceeds pending balance');
    }

    await this.walletRepository.executeTransactionInTransaction(tx, {
      transactionCode: `SETTLEMENT:${input.shopId}:${amount.toFixed(2)}`,
      transactionType: WalletTransactionType.SETTLEMENT,
      idempotencyKey: `SHOP:${input.shopId}:SETTLEMENT:${amount.toFixed(2)}`,
      amount,
      referenceType: 'SHOP_WALLET',
      referenceId: input.shopId,
      description: `Reconcile shop wallet ${input.shopId}`,
      entries: [
        {
          walletId: wallet.id,
          direction: WalletEntryDirection.DEBIT,
          balanceType: WalletBalanceType.PENDING,
          amount,
        },
        {
          walletId: wallet.id,
          direction: WalletEntryDirection.CREDIT,
          balanceType: WalletBalanceType.AVAILABLE,
          amount,
        },
      ],
    });

    return { shopId: input.shopId, amount: amount.toFixed(2) };
  }
}
