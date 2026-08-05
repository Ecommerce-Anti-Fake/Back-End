import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PayoutAccount, Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';
import { PayoutAccountSecurityService } from '../../domain';
import { WalletService } from '../use-cases/wallet.service';
import { WithdrawalAuthorizationService } from './withdrawal-authorization.service';

export type PayoutAccountMutationInput = {
  userId: string;
  requesterRole: string;
  shopId?: string;
  authorizationToken: string;
  verificationId: string;
};

type OwnerContext = {
  ownerType: 'USER' | 'SHOP';
  userId?: string;
  shopId?: string;
};

@Injectable()
export class PayoutAccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly authorizationService: WithdrawalAuthorizationService,
    private readonly security: PayoutAccountSecurityService,
  ) {}

  async create(input: PayoutAccountMutationInput) {
    const wallet = await this.resolveWallet(input.userId, input.requesterRole, input.shopId);
    const owner = this.resolveOwnerContext(input.userId, input.shopId);
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const verification = await tx.bankAccountVerification.findUnique({
        where: { id: input.verificationId },
      });
      const ownsVerification =
        verification?.userId === input.userId &&
        (input.shopId
          ? verification.shopId === input.shopId
          : verification.shopId === null);
      if (!verification || !ownsVerification) {
        throw new ForbiddenException('Bank account verification does not belong to this wallet owner');
      }
      if (verification.consumedAt || verification.expiresAt <= now) {
        throw new BadRequestException('Bank account verification has expired or was already used');
      }

      await this.authorizationService.consumeInTransaction(tx, {
        authorizationToken: input.authorizationToken,
        userId: input.userId,
        walletId: wallet.id,
        operation: 'CREATE_PAYOUT_ACCOUNT',
        payload: { bankAccountVerificationId: verification.id },
      });

      const duplicate = await tx.payoutAccount.findFirst({
        where: {
          bankBin: verification.bankBin,
          accountNumberHash: verification.accountNumberHash,
          ...(owner.shopId ? { shopId: owner.shopId } : { userId: owner.userId }),
          disabledAt: null,
        },
        select: { id: true },
      });
      if (duplicate) throw new BadRequestException('This payout account already exists');

      const consumed = await tx.bankAccountVerification.updateMany({
        where: {
          id: verification.id,
          consumedAt: null,
          expiresAt: { gt: now },
        },
        data: { consumedAt: now },
      });
      if (consumed.count !== 1) {
        throw new BadRequestException('Bank account verification has expired or was already used');
      }

      const account = await tx.payoutAccount.create({
        data: {
          ownerType: owner.ownerType,
          userId: owner.userId,
          shopId: owner.shopId,
          bankBin: verification.bankBin,
          bankCode: verification.bankCode,
          bankName: verification.bankName,
          accountNumberEncrypted: verification.accountNumberEncrypted,
          accountNumberHash: verification.accountNumberHash,
          accountNumberLast4: verification.accountNumberLast4,
          accountNumberLength: verification.accountNumberLength,
          declaredAccountHolder: verification.accountHolder,
          resolvedAccountHolder: verification.accountHolder,
          verificationStatus: 'VERIFIED',
          verificationMethod: 'PROVIDER',
          verifiedAt: now,
          availableAfter: new Date(now.getTime() + 24 * 60 * 60_000),
        },
      });
      return this.toResponse(account);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async list(input: { userId: string; requesterRole: string; shopId?: string }) {
    if (input.shopId) {
      const allowed = await this.walletService.canAccessShopWallet(input.shopId, input.userId, input.requesterRole);
      if (!allowed) throw new ForbiddenException('You cannot access this shop wallet');
    }
    const items = await this.prisma.payoutAccount.findMany({
      where: {
        ...(input.shopId ? { shopId: input.shopId } : { userId: input.userId }),
        disabledAt: null,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 20,
    });
    return items.map((item) => this.toResponse(item));
  }

  async listForAdmin(status?: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'DISABLED') {
    const items = await this.prisma.payoutAccount.findMany({
      where: status ? { verificationStatus: status } : {},
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
    });
    return items.map((item) => this.toResponse(item));
  }

  async disable(input: {
    payoutAccountId: string;
    userId: string;
    requesterRole: string;
    shopId?: string;
    authorizationToken: string;
  }) {
    const wallet = await this.resolveWallet(input.userId, input.requesterRole, input.shopId);
    const account = await this.findOwnedAccount(input.payoutAccountId, input.userId, input.shopId);
    return this.prisma.$transaction(async (tx) => {
      await this.authorizationService.consumeInTransaction(tx, {
        authorizationToken: input.authorizationToken,
        userId: input.userId,
        walletId: wallet.id,
        payoutAccountId: account.id,
        operation: 'DELETE_PAYOUT_ACCOUNT',
        payload: {},
      });
      const activeWithdrawals = await tx.walletWithdrawal.count({
        where: { payoutAccountId: account.id, status: { in: ['PENDING', 'PROCESSING'] } },
      });
      if (activeWithdrawals > 0) throw new BadRequestException('Payout account has an active withdrawal');
      await tx.payoutAccount.update({
        where: { id: account.id },
        data: { verificationStatus: 'DISABLED', disabledAt: new Date() },
      });
      return { success: true, message: 'Đã vô hiệu hóa tài khoản nhận tiền.' };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async verifyManually(input: {
    payoutAccountId: string;
    adminUserId: string;
    resolvedAccountHolder: string;
  }) {
    const account = await this.prisma.payoutAccount.findUnique({ where: { id: input.payoutAccountId } });
    if (!account || account.disabledAt) throw new NotFoundException('Payout account not found');
    if (account.verificationStatus !== 'PENDING') throw new BadRequestException('Payout account is not pending verification');
    const resolvedAccountHolder = input.resolvedAccountHolder.trim();
    if (!resolvedAccountHolder) throw new BadRequestException('Resolved account holder is required');

    const verifiedAt = new Date();
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.payoutAccount.update({
        where: { id: account.id },
        data: {
          verificationStatus: 'VERIFIED',
          verificationMethod: 'MANUAL_BANK_APP',
          verifiedByUserId: input.adminUserId,
          resolvedAccountHolder,
          verifiedAt,
          rejectionReason: null,
        },
      });
      await tx.auditLog.create({
        data: {
          targetType: 'PAYOUT_ACCOUNT',
          targetId: account.id,
          actorUserId: input.adminUserId,
          action: 'VERIFY_PAYOUT_ACCOUNT_MANUALLY',
          fromStatus: account.verificationStatus,
          toStatus: 'VERIFIED',
          metadata: { verificationMethod: 'MANUAL_BANK_APP' },
        },
      });
      return this.toResponse(updated);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async rejectManually(input: { payoutAccountId: string; adminUserId: string; reason: string }) {
    const reason = input.reason.trim();
    if (!reason) throw new BadRequestException('Rejection reason is required');
    const account = await this.prisma.payoutAccount.findUnique({ where: { id: input.payoutAccountId } });
    if (!account || account.disabledAt) throw new NotFoundException('Payout account not found');
    if (account.verificationStatus !== 'PENDING') throw new BadRequestException('Payout account is not pending verification');

    const updated = await this.prisma.$transaction(async (tx) => {
      const rejected = await tx.payoutAccount.update({
        where: { id: account.id },
        data: { verificationStatus: 'REJECTED', rejectionReason: reason, verifiedByUserId: input.adminUserId },
      });
      await tx.auditLog.create({
        data: {
          targetType: 'PAYOUT_ACCOUNT', targetId: account.id, actorUserId: input.adminUserId,
          action: 'REJECT_PAYOUT_ACCOUNT', fromStatus: account.verificationStatus, toStatus: 'REJECTED', note: reason,
        },
      });
      return rejected;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return this.toResponse(updated);
  }

  async revealForAdmin(input: { payoutAccountId: string; adminUserId: string; reason: string }) {
    const reason = input.reason.trim();
    if (!reason) throw new BadRequestException('Reveal reason is required');
    const account = await this.prisma.payoutAccount.findUnique({ where: { id: input.payoutAccountId } });
    if (!account || account.disabledAt) throw new NotFoundException('Payout account not found');
    await this.prisma.auditLog.create({
      data: {
        targetType: 'PAYOUT_ACCOUNT', targetId: account.id, actorUserId: input.adminUserId,
        action: 'REVEAL_PAYOUT_ACCOUNT_NUMBER', note: reason,
      },
    });
    return {
      ...this.toResponse(account),
      accountNumber: this.security.decryptAccountNumber(account.accountNumberEncrypted),
    };
  }

  async revealWithdrawalForAdmin(input: { withdrawalId: string; adminUserId: string; reason: string }) {
    const reason = input.reason.trim();
    if (!reason) throw new BadRequestException('Reveal reason is required');
    const withdrawal = await this.prisma.walletWithdrawal.findUnique({
      where: { id: input.withdrawalId },
      include: { payoutAccount: { select: { accountNumberEncrypted: true } } },
    });
    if (!withdrawal) throw new NotFoundException('Withdrawal not found');
    const accountNumber = this.resolveWithdrawalAccountNumber(withdrawal);
    if (!accountNumber) throw new NotFoundException('Withdrawal account number is unavailable');
    await this.prisma.auditLog.create({
      data: {
        targetType: 'WALLET_WITHDRAWAL', targetId: withdrawal.id, actorUserId: input.adminUserId,
        action: 'PREPARE_WITHDRAWAL_TRANSFER_QR', note: reason,
      },
    });
    return {
      id: withdrawal.id,
      bankBin: withdrawal.bankBin,
      bankCode: withdrawal.bankCode,
      bankName: withdrawal.bankName,
      accountHolder: withdrawal.accountHolder,
      accountNumber,
      amount: withdrawal.amount.toFixed(2),
      currency: 'VND',
      transferContent: `AFWD ${withdrawal.id.replace(/-/g, '').slice(0, 12).toUpperCase()}`,
    };
  }

  private resolveWithdrawalAccountNumber(withdrawal: {
    accountNumber?: string | null;
    accountNumberEncryptedSnapshot?: string | null;
    payoutAccount?: { accountNumberEncrypted: string } | null;
  }) {
    const plainAccountNumber = withdrawal.accountNumber?.replace(/\s+/g, '').trim();
    if (plainAccountNumber) return plainAccountNumber;

    const encryptedValues = [
      withdrawal.accountNumberEncryptedSnapshot,
      withdrawal.payoutAccount?.accountNumberEncrypted,
    ].filter((value): value is string => Boolean(value));

    for (const value of encryptedValues) {
      // Older UAT seed rows encoded the fixture account in this explicit marker
      // instead of using the production AES-GCM format.
      const legacySeedAccount = /^seed-encrypted-(\d{6,19})$/.exec(value);
      if (legacySeedAccount) return legacySeedAccount[1];
      if (value.startsWith('seed-encrypted-')) continue;
      return this.security.decryptAccountNumber(value);
    }

    return null;
  }

  private async resolveWallet(userId: string, requesterRole: string, shopId?: string) {
    if (shopId) {
      const allowed = await this.walletService.canAccessShopWallet(shopId, userId, requesterRole);
      if (!allowed) throw new ForbiddenException('You cannot access this shop wallet');
      return this.walletService.findOrCreateShopWallet(shopId, 'VND');
    }
    return this.walletService.findOrCreateUserWallet(userId, 'VND');
  }

  private async findOwnedAccount(payoutAccountId: string, userId: string, shopId?: string) {
    const account = await this.prisma.payoutAccount.findUnique({ where: { id: payoutAccountId } });
    if (!account || account.disabledAt) throw new NotFoundException('Payout account not found');
    if (shopId ? account.shopId !== shopId : account.userId !== userId) {
      throw new ForbiddenException('Payout account does not belong to this wallet owner');
    }
    return account;
  }

  private resolveOwnerContext(userId: string, shopId?: string): OwnerContext {
    if (shopId) {
      return { ownerType: 'SHOP', shopId };
    }
    return { ownerType: 'USER', userId };
  }

  private toResponse(account: PayoutAccount) {
    return {
      id: account.id,
      ownerType: account.ownerType,
      bankBin: account.bankBin,
      bankCode: account.bankCode,
      bankName: account.bankName,
      accountNumberMasked: `${'*'.repeat(Math.max(0, account.accountNumberLength - 4))}${account.accountNumberLast4}`,
      accountHolder: account.declaredAccountHolder,
      resolvedAccountHolder: account.resolvedAccountHolder,
      verificationStatus: account.verificationStatus,
      verificationMethod: account.verificationMethod,
      availableAfter: account.availableAfter,
      verifiedAt: account.verifiedAt,
      rejectionReason: account.rejectionReason,
      createdAt: account.createdAt,
    };
  }
}
