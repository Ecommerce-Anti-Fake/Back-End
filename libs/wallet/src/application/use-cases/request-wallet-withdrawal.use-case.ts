import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, WalletBalanceType, WalletEntryDirection, WalletTransactionType } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';
import { WithdrawalAuthorizationService } from '../services';
import { WalletRepository } from '../../infrastructure/persistence/wallet.repository';
import { WalletService } from './wallet.service';

export interface RequestWalletWithdrawalInput {
  shopId?: string;
  requesterUserId: string;
  requesterRole: string;
  amount: string | number | Prisma.Decimal;
  payoutAccountId: string;
  idempotencyKey: string;
  authorizationToken: string;
}

@Injectable()
export class RequestWalletWithdrawalUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly walletRepository: WalletRepository,
    private readonly authorizationService: WithdrawalAuthorizationService,
    private readonly configService: ConfigService,
  ) {}

  async execute(input: RequestWalletWithdrawalInput) {
    if (input.shopId) {
      if (!this.isEnabled('SELLER_WITHDRAWALS_ENABLED', false)) {
        throw new ForbiddenException('Seller withdrawals are not enabled');
      }
      if (!(await this.walletService.canAccessShopWallet(input.shopId, input.requesterUserId, input.requesterRole))) {
        throw new ForbiddenException('You cannot access this shop wallet');
      }
    } else if (!this.isEnabled('BUYER_WITHDRAWALS_ENABLED', false)) {
      throw new ForbiddenException('Buyer withdrawals are not enabled');
    }

    return this.prisma.$transaction(
      (tx) => this.executeInTransaction(tx, input),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async executeInTransaction(tx: Prisma.TransactionClient, input: RequestWalletWithdrawalInput) {
    const wallet = input.shopId
      ? await this.walletRepository.findShopWalletInTransaction(tx, input.shopId, 'VND')
      : await this.walletRepository.findUserWalletInTransaction(tx, input.requesterUserId, 'VND');
    if (!wallet) throw new NotFoundException(input.shopId ? 'Shop wallet not found' : 'User wallet not found');

    const amount = new Prisma.Decimal(input.amount);
    if (amount.lessThan(100_000)) throw new BadRequestException('Minimum withdrawal amount is 100000 VND');
    if (amount.greaterThan(wallet.availableBalance)) throw new BadRequestException('Insufficient available balance');
    const clientKey = input.idempotencyKey?.trim();
    if (!clientKey) throw new BadRequestException('Idempotency key is required');
    const idempotencyKey = `WITHDRAWAL:${input.requesterUserId}:${clientKey}`;

    const existing = await tx.walletWithdrawal.findUnique({ where: { idempotencyKey } });
    if (existing) {
      if (!existing.amount.equals(amount) || existing.payoutAccountId !== input.payoutAccountId || existing.walletId !== wallet.id) {
        throw new BadRequestException('Idempotency key was already used for a different withdrawal');
      }
      return this.toResponse(existing);
    }

    const payoutAccount = await tx.payoutAccount.findUnique({ where: { id: input.payoutAccountId } });
    if (!payoutAccount || payoutAccount.disabledAt) throw new NotFoundException('Payout account not found');
    const ownsAccount = input.shopId
      ? payoutAccount.shopId === input.shopId
      : payoutAccount.userId === input.requesterUserId;
    if (!ownsAccount) throw new ForbiddenException('Payout account does not belong to this wallet owner');
    if (payoutAccount.verificationStatus !== 'VERIFIED') {
      throw new BadRequestException('Payout account is not verified');
    }
    if (payoutAccount.availableAfter > new Date()) {
      throw new BadRequestException('Payout account is in the security cooldown period');
    }

    await this.authorizationService.consumeInTransaction(tx, {
      authorizationToken: input.authorizationToken,
      userId: input.requesterUserId,
      walletId: wallet.id,
      payoutAccountId: payoutAccount.id,
      operation: 'CREATE_WITHDRAWAL',
      payload: { amount: amount.toFixed(2) },
    });

    const withdrawal = await tx.walletWithdrawal.create({
      data: {
        walletId: wallet.id,
        payoutAccountId: payoutAccount.id,
        requestedByUserId: input.requesterUserId,
        idempotencyKey,
        amount,
        bankBin: payoutAccount.bankBin,
        bankCode: payoutAccount.bankCode,
        bankName: payoutAccount.bankName,
        accountNumber: null,
        accountNumberEncryptedSnapshot: payoutAccount.accountNumberEncrypted,
        accountNumberLast4: payoutAccount.accountNumberLast4,
        accountNumberLength: payoutAccount.accountNumberLength,
        accountHolder: payoutAccount.resolvedAccountHolder ?? payoutAccount.declaredAccountHolder,
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

  private toResponse(withdrawal: {
    id: string;
    payoutAccountId: string | null;
    amount: Prisma.Decimal;
    bankName: string;
    accountHolder: string;
    accountNumberLast4: string | null;
    accountNumberLength?: number | null;
    status: string;
    createdAt: Date;
    processedAt: Date | null;
  }) {
    const length = withdrawal.accountNumberLength ?? 8;
    return {
      id: withdrawal.id,
      payoutAccountId: withdrawal.payoutAccountId,
      amount: withdrawal.amount.toFixed(2),
      fee: '0.00',
      bankName: withdrawal.bankName,
      accountNumberMasked: withdrawal.accountNumberLast4
        ? `${'*'.repeat(Math.max(0, length - 4))}${withdrawal.accountNumberLast4}`
        : null,
      accountHolder: withdrawal.accountHolder,
      status: withdrawal.status,
      createdAt: withdrawal.createdAt,
      processedAt: withdrawal.processedAt,
    };
  }

  private isEnabled(name: string, defaultValue: boolean) {
    const value = this.configService.get<string | boolean>(name);
    if (value === undefined || value === null || value === '') return defaultValue;
    if (typeof value === 'boolean') return value;
    return value.trim().toLowerCase() === 'true';
  }
}
