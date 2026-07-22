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
  bankBin: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
};

type OwnerContext = {
  ownerType: 'USER' | 'SHOP';
  userId?: string;
  shopId?: string;
  expectedHolder: string;
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
    const owner = await this.resolveOwnerContext(input.userId, input.shopId);
    if (!this.security.holderNamesMatch(input.accountHolder, owner.expectedHolder)) {
      throw new BadRequestException('Payout account holder must match the verified owner');
    }

    const accountNumber = this.security.normalizeAccountNumber(input.accountNumber);
    const bankBin = input.bankBin.trim();
    const bankCode = input.bankCode.trim().toUpperCase();
    const bankName = input.bankName.trim();
    const accountHolder = input.accountHolder.trim();
    const accountNumberHash = this.security.hashAccountNumber(bankBin, accountNumber);
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      await this.authorizationService.consumeInTransaction(tx, {
        authorizationToken: input.authorizationToken,
        userId: input.userId,
        walletId: wallet.id,
        operation: 'CREATE_PAYOUT_ACCOUNT',
        payload: { bankBin, bankCode, bankName, accountNumber, accountHolder },
      });

      const duplicate = await tx.payoutAccount.findFirst({
        where: {
          bankBin,
          accountNumberHash,
          ...(owner.shopId ? { shopId: owner.shopId } : { userId: owner.userId }),
          disabledAt: null,
        },
        select: { id: true },
      });
      if (duplicate) throw new BadRequestException('This payout account already exists');

      const account = await tx.payoutAccount.create({
        data: {
          ownerType: owner.ownerType,
          userId: owner.userId,
          shopId: owner.shopId,
          bankBin,
          bankCode,
          bankName,
          accountNumberEncrypted: this.security.encryptAccountNumber(accountNumber),
          accountNumberHash,
          accountNumberLast4: accountNumber.slice(-4),
          accountNumberLength: accountNumber.length,
          declaredAccountHolder: accountHolder,
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
        where: { payoutAccountId: account.id, status: { in: ['PENDING', 'APPROVED', 'PROCESSING'] } },
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
    const owner = await this.resolveOwnerContext(account.userId ?? '', account.shopId ?? undefined);
    const resolvedAccountHolder = input.resolvedAccountHolder.trim();
    if (!this.security.holderNamesMatch(resolvedAccountHolder, owner.expectedHolder)) {
      throw new BadRequestException('Bank beneficiary name does not match the verified owner');
    }

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
    const withdrawal = await this.prisma.walletWithdrawal.findUnique({ where: { id: input.withdrawalId } });
    if (!withdrawal) throw new NotFoundException('Withdrawal not found');
    const accountNumber = withdrawal.accountNumberEncryptedSnapshot
      ? this.security.decryptAccountNumber(withdrawal.accountNumberEncryptedSnapshot)
      : withdrawal.accountNumber;
    if (!accountNumber) throw new NotFoundException('Withdrawal account number is unavailable');
    await this.prisma.auditLog.create({
      data: {
        targetType: 'WALLET_WITHDRAWAL', targetId: withdrawal.id, actorUserId: input.adminUserId,
        action: 'REVEAL_WITHDRAWAL_ACCOUNT_NUMBER', note: reason,
      },
    });
    return {
      id: withdrawal.id,
      bankName: withdrawal.bankName,
      accountHolder: withdrawal.accountHolder,
      accountNumber,
    };
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

  private async resolveOwnerContext(userId: string, shopId?: string): Promise<OwnerContext> {
    if (shopId) {
      const shop = await this.prisma.shop.findUnique({
        where: { id: shopId },
        select: {
          id: true, ownerUserId: true, businessType: true, verifiedLegalName: true, shopStatus: true,
          owner: { select: { kyc: { select: { fullName: true, verificationStatus: true, verifiedAt: true } } } },
        },
      });
      if (!shop) throw new NotFoundException('Shop not found');
      if (shop.shopStatus !== 'verified') throw new BadRequestException('Shop must be verified before adding a payout account');
      const isCompany = this.isCompany(shop.businessType) || Boolean(shop.verifiedLegalName);
      if (isCompany && !shop.verifiedLegalName?.trim()) {
        throw new BadRequestException('Company legal name must be verified before adding a payout account');
      }
      if (!isCompany) this.assertApprovedKyc(shop.owner.kyc);
      return {
        ownerType: 'SHOP',
        shopId: shop.id,
        expectedHolder: isCompany ? shop.verifiedLegalName!.trim() : shop.owner.kyc!.fullName,
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, kyc: { select: { fullName: true, verificationStatus: true, verifiedAt: true } } },
    });
    if (!user) throw new NotFoundException('User not found');
    this.assertApprovedKyc(user.kyc);
    return { ownerType: 'USER', userId: user.id, expectedHolder: user.kyc!.fullName };
  }

  private assertApprovedKyc(kyc: { fullName: string; verificationStatus: string; verifiedAt: Date | null } | null) {
    if (!kyc || kyc.verificationStatus.toLowerCase() !== 'approved' || !kyc.verifiedAt) {
      throw new BadRequestException('Approved KYC is required before adding a payout account');
    }
  }

  private isCompany(value: string) {
    const normalized = this.security.normalizeHolderName(value);
    return normalized === 'COMPANY' || normalized === 'DOANH NGHIEP' || normalized === 'ENTERPRISE';
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
