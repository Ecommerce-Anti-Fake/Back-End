import { Injectable } from '@nestjs/common';
import {
  Prisma,
  WalletBalanceType,
  WalletEntryDirection,
  WalletTransactionType,
} from '@prisma/client';
import { WalletRepositoryPort, WalletTransactionInput } from '../ports';

@Injectable()
export class WalletService {
  constructor(private readonly walletRepository: WalletRepositoryPort) {}

  findById(walletId: string) {
    return this.walletRepository.findById(walletId);
  }

  findOrCreateUserWallet(userId: string, currency = 'VND') {
    return this.walletRepository.findOrCreateUserWallet(userId, currency);
  }

  findOrCreateShopWallet(shopId: string, currency = 'VND') {
    return this.walletRepository.findOrCreateShopWallet(shopId, currency);
  }

  findOrCreatePlatformWallet(platformCode: string, currency = 'VND') {
    return this.walletRepository.findOrCreatePlatformWallet(
      platformCode,
      currency,
    );
  }

  canAccessShopWallet(
    shopId: string,
    requesterUserId: string,
    requesterRole: string,
  ) {
    return this.walletRepository.canAccessShopWallet(
      shopId,
      requesterUserId,
      requesterRole,
    );
  }

  listLedger(walletId: string, page = 1, pageSize = 20) {
    return this.walletRepository.listLedger(walletId, page, pageSize);
  }

  executeTransaction(input: WalletTransactionInput) {
    return this.walletRepository.executeTransaction(input);
  }

  async payOrder(input: {
    userId: string;
    orderId: string;
    paymentIntentId?: string | null;
    amount: Prisma.Decimal;
  }) {
    const userWallet = await this.findOrCreateUserWallet(input.userId);
    const revenueWallet = await this.findOrCreatePlatformWallet('PLATFORM_REVENUE_VND');
    const escrowWallet = await this.findOrCreatePlatformWallet('PLATFORM_ESCROW_VND');

    await this.executeTransaction({
      transactionCode: `PAYMENT:${input.orderId}`,
      transactionType: WalletTransactionType.PAYMENT,
      idempotencyKey: `ORDER:${input.orderId}:WALLET_PAYMENT`,
      amount: input.amount,
      referenceType: 'ORDER',
      referenceId: input.orderId,
      orderId: input.orderId,
      paymentIntentId: input.paymentIntentId ?? null,
      description: `Wallet payment for order ${input.orderId}`,
      entries: [
        { walletId: userWallet.id, direction: WalletEntryDirection.DEBIT, balanceType: WalletBalanceType.AVAILABLE, amount: input.amount },
        { walletId: revenueWallet.id, direction: WalletEntryDirection.CREDIT, balanceType: WalletBalanceType.AVAILABLE, amount: input.amount },
      ],
    });

    return this.executeTransaction({
      transactionCode: `ESCROW_HOLD:${input.orderId}`,
      transactionType: WalletTransactionType.ESCROW_HOLD,
      idempotencyKey: `ORDER:${input.orderId}:WALLET_ESCROW_HOLD`,
      amount: input.amount,
      referenceType: 'ORDER',
      referenceId: input.orderId,
      orderId: input.orderId,
      paymentIntentId: input.paymentIntentId ?? null,
      description: `Hold wallet payment for order ${input.orderId}`,
      entries: [
        { walletId: revenueWallet.id, direction: WalletEntryDirection.DEBIT, balanceType: WalletBalanceType.AVAILABLE, amount: input.amount },
        { walletId: escrowWallet.id, direction: WalletEntryDirection.CREDIT, balanceType: WalletBalanceType.LOCKED, amount: input.amount },
      ],
    });
  }

  async refundOrder(input: {
    userId: string;
    orderId: string;
    paymentIntentId?: string | null;
    amount: Prisma.Decimal;
  }) {
    const userWallet = await this.findOrCreateUserWallet(input.userId);
    const revenueWallet = await this.findOrCreatePlatformWallet('PLATFORM_REVENUE_VND');
    const escrowWallet = await this.findOrCreatePlatformWallet('PLATFORM_ESCROW_VND');

    await this.executeTransaction({
      transactionCode: `REFUND_ESCROW:${input.orderId}`,
      transactionType: WalletTransactionType.REFUND,
      idempotencyKey: `ORDER:${input.orderId}:WALLET_REFUND_ESCROW`,
      amount: input.amount,
      referenceType: 'ORDER',
      referenceId: input.orderId,
      orderId: input.orderId,
      paymentIntentId: input.paymentIntentId ?? null,
      description: `Release escrow for wallet refund ${input.orderId}`,
      entries: [
        { walletId: escrowWallet.id, direction: WalletEntryDirection.DEBIT, balanceType: WalletBalanceType.LOCKED, amount: input.amount },
        { walletId: revenueWallet.id, direction: WalletEntryDirection.CREDIT, balanceType: WalletBalanceType.AVAILABLE, amount: input.amount },
      ],
    });

    return this.executeTransaction({
      transactionCode: `REFUND_USER:${input.orderId}`,
      transactionType: WalletTransactionType.REFUND,
      idempotencyKey: `ORDER:${input.orderId}:WALLET_REFUND_USER`,
      amount: input.amount,
      referenceType: 'ORDER',
      referenceId: input.orderId,
      orderId: input.orderId,
      paymentIntentId: input.paymentIntentId ?? null,
      description: `Refund wallet payment to user ${input.orderId}`,
      entries: [
        { walletId: revenueWallet.id, direction: WalletEntryDirection.DEBIT, balanceType: WalletBalanceType.AVAILABLE, amount: input.amount },
        { walletId: userWallet.id, direction: WalletEntryDirection.CREDIT, balanceType: WalletBalanceType.AVAILABLE, amount: input.amount },
      ],
    });
  }
}
