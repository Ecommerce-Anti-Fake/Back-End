import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  Prisma,
  WithdrawalAuthorizationChannel,
  WithdrawalAuthorizationOperation,
} from '@prisma/client';
import { FirebaseTokenVerifierService, VerifiedFirebaseToken } from '@auth';
import { PrismaService } from '@database/prisma/prisma.service';
import { randomBytes } from 'node:crypto';
import { PayoutAccountSecurityService } from '../../domain';
import { WalletService } from '../use-cases/wallet.service';

type AuthorizationPayload = {
  amount?: string;
  bankBin?: string;
  bankCode?: string;
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
};

export type CreateWithdrawalAuthorizationInput = AuthorizationPayload & {
  userId: string;
  requesterRole: string;
  shopId?: string;
  payoutAccountId?: string;
  operation: WithdrawalAuthorizationOperation;
  channel: WithdrawalAuthorizationChannel;
};

export type ConsumeWithdrawalAuthorizationInput = {
  authorizationToken: string;
  userId: string;
  walletId: string;
  payoutAccountId?: string;
  operation: WithdrawalAuthorizationOperation;
  payload: AuthorizationPayload;
};

@Injectable()
export class WithdrawalAuthorizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly firebaseTokenVerifier: FirebaseTokenVerifierService,
    private readonly security: PayoutAccountSecurityService,
  ) {}

  async createChallenge(input: CreateWithdrawalAuthorizationInput) {
    const now = new Date();
    const wallet = await this.resolveWallet(input);
    await this.assertPayoutAccountAccess(input, wallet.id);
    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
      select: { email: true, phone: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (input.channel === 'EMAIL' && !user.email) throw new BadRequestException('No email is linked to this account');
    if (input.channel === 'PHONE' && !user.phone) throw new BadRequestException('No phone number is linked to this account');

    const activeLock = await this.prisma.withdrawalAuthorization.findFirst({
      where: { userId: input.userId, lockedUntil: { gt: now } },
      select: { lockedUntil: true },
      orderBy: { createdAt: 'desc' },
    });
    if (activeLock) throw new HttpException('Authorization verification is temporarily locked', HttpStatus.TOO_MANY_REQUESTS);

    const windowStart = new Date(now.getTime() - 15 * 60_000);
    const [recentCount, latest] = await Promise.all([
      this.prisma.withdrawalAuthorization.count({ where: { userId: input.userId, createdAt: { gte: windowStart } } }),
      this.prisma.withdrawalAuthorization.findFirst({
        where: { userId: input.userId }, select: { createdAt: true }, orderBy: { createdAt: 'desc' },
      }),
    ]);
    if (recentCount >= 3) throw new HttpException('Too many authorization challenges', HttpStatus.TOO_MANY_REQUESTS);
    if (latest && now.getTime() - latest.createdAt.getTime() < 60_000) {
      throw new HttpException('Please wait before requesting another verification', HttpStatus.TOO_MANY_REQUESTS);
    }

    const payload = this.normalizePayload(input);
    this.assertOperationPayload(input.operation, input.payoutAccountId, payload);
    const expiresAt = new Date(now.getTime() + 5 * 60_000);
    const challenge = await this.prisma.withdrawalAuthorization.create({
      data: {
        userId: input.userId,
        walletId: wallet.id,
        payoutAccountId: input.payoutAccountId,
        operation: input.operation,
        channel: input.channel,
        operationDigest: this.buildDigest(input.operation, wallet.id, input.payoutAccountId, payload),
        expiresAt,
      },
      select: { id: true },
    });
    return { challengeId: challenge.id, channel: input.channel, expiresAt, verificationProvider: 'FIREBASE_CLIENT' };
  }

  async verifyChallenge(input: { challengeId: string; userId: string; firebaseIdToken: string }) {
    const now = new Date();
    const challenge = await this.prisma.withdrawalAuthorization.findFirst({
      where: { id: input.challengeId, userId: input.userId },
    });
    if (!challenge) throw new NotFoundException('Authorization challenge not found');
    if (challenge.expiresAt <= now) throw new BadRequestException('Authorization challenge has expired');
    if (challenge.consumedAt || challenge.verifiedAt) throw new BadRequestException('Authorization challenge has already been used');
    if (challenge.lockedUntil && challenge.lockedUntil > now) {
      throw new HttpException('Authorization verification is temporarily locked', HttpStatus.TOO_MANY_REQUESTS);
    }

    try {
      const token = await this.firebaseTokenVerifier.verifyIdToken(input.firebaseIdToken);
      const user = await this.prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true, email: true, phone: true },
      });
      if (!user) throw new NotFoundException('User not found');
      this.assertFreshProof(token, challenge.createdAt, challenge.channel);
      this.assertMatchingContact(token, user, challenge.channel);
    } catch (error) {
      await this.recordFailure(challenge.id, challenge.failedAttempts, now);
      throw error;
    }

    const authorizationToken = randomBytes(32).toString('base64url');
    const issued = await this.prisma.withdrawalAuthorization.updateMany({
      where: { id: challenge.id, verifiedAt: null, consumedAt: null, expiresAt: { gt: now } },
      data: {
        authorizationTokenHash: this.security.tokenHash(authorizationToken),
        verifiedAt: now,
      },
    });
    if (issued.count !== 1) throw new UnauthorizedException('Authorization challenge has already been used');
    return { authorizationToken, expiresAt: challenge.expiresAt };
  }

  async consumeInTransaction(tx: Prisma.TransactionClient, input: ConsumeWithdrawalAuthorizationInput) {
    const now = new Date();
    const tokenHash = this.security.tokenHash(input.authorizationToken);
    const authorization = await tx.withdrawalAuthorization.findUnique({
      where: { authorizationTokenHash: tokenHash },
    });
    if (!authorization || authorization.userId !== input.userId) {
      throw new UnauthorizedException('Invalid authorization token');
    }
    if (!authorization.verifiedAt || authorization.expiresAt <= now) {
      throw new UnauthorizedException('Authorization token has expired');
    }
    if (authorization.consumedAt) throw new UnauthorizedException('Authorization token has already been used');
    if (
      authorization.walletId !== input.walletId ||
      authorization.payoutAccountId !== (input.payoutAccountId ?? null) ||
      authorization.operation !== input.operation
    ) {
      throw new UnauthorizedException('Authorization token does not match this operation');
    }

    const payload = this.normalizePayload(input.payload);
    const expectedDigest = this.buildDigest(
      input.operation, input.walletId, input.payoutAccountId, payload,
    );
    if (authorization.operationDigest !== expectedDigest) {
      throw new UnauthorizedException('Authorization token does not match this operation');
    }

    const consumed = await tx.withdrawalAuthorization.updateMany({
      where: { id: authorization.id, consumedAt: null, expiresAt: { gt: now } },
      data: { consumedAt: now },
    });
    if (consumed.count !== 1) throw new UnauthorizedException('Authorization token has already been used');
    return authorization;
  }

  private async resolveWallet(input: CreateWithdrawalAuthorizationInput) {
    if (input.shopId) {
      const allowed = await this.walletService.canAccessShopWallet(input.shopId, input.userId, input.requesterRole);
      if (!allowed) throw new ForbiddenException('You cannot access this shop wallet');
      return this.walletService.findOrCreateShopWallet(input.shopId, 'VND');
    }
    return this.walletService.findOrCreateUserWallet(input.userId, 'VND');
  }

  private async assertPayoutAccountAccess(input: CreateWithdrawalAuthorizationInput, walletId: string) {
    if (!input.payoutAccountId) return;
    const account = await this.prisma.payoutAccount.findUnique({ where: { id: input.payoutAccountId } });
    if (!account || account.disabledAt) throw new NotFoundException('Payout account not found');
    const ownsAccount = input.shopId ? account.shopId === input.shopId : account.userId === input.userId;
    if (!ownsAccount) throw new ForbiddenException('Payout account does not belong to this wallet owner');
    const wallet = await this.prisma.wallet.findUnique({ where: { id: walletId }, select: { userId: true, shopId: true } });
    if (!wallet || (input.shopId ? wallet.shopId !== input.shopId : wallet.userId !== input.userId)) {
      throw new ForbiddenException('Wallet ownership mismatch');
    }
  }

  private normalizePayload(payload: AuthorizationPayload): AuthorizationPayload {
    return {
      ...(payload.amount !== undefined ? { amount: new Prisma.Decimal(payload.amount).toFixed(2) } : {}),
      ...(payload.bankBin !== undefined ? { bankBin: payload.bankBin.trim() } : {}),
      ...(payload.bankCode !== undefined ? { bankCode: payload.bankCode.trim().toUpperCase() } : {}),
      ...(payload.bankName !== undefined ? { bankName: payload.bankName.trim() } : {}),
      ...(payload.accountNumber !== undefined ? { accountNumber: this.security.normalizeAccountNumber(payload.accountNumber) } : {}),
      ...(payload.accountHolder !== undefined ? { accountHolder: this.security.normalizeHolderName(payload.accountHolder) } : {}),
    };
  }

  private buildDigest(
    operation: WithdrawalAuthorizationOperation,
    walletId: string,
    payoutAccountId: string | undefined,
    payload: AuthorizationPayload,
  ) {
    return this.security.operationDigest({ operation, walletId, payoutAccountId: payoutAccountId ?? '', ...payload });
  }

  private assertOperationPayload(
    operation: WithdrawalAuthorizationOperation,
    payoutAccountId: string | undefined,
    payload: AuthorizationPayload,
  ) {
    if (operation === 'CREATE_WITHDRAWAL' && (!payoutAccountId || !payload.amount)) {
      throw new BadRequestException('Withdrawal authorization requires payout account and amount');
    }
    if (operation === 'CREATE_PAYOUT_ACCOUNT') {
      const required = [payload.bankBin, payload.bankCode, payload.bankName, payload.accountNumber, payload.accountHolder];
      if (required.some((value) => !value)) throw new BadRequestException('Payout account authorization is incomplete');
    }
    if (operation === 'DELETE_PAYOUT_ACCOUNT' && !payoutAccountId) {
      throw new BadRequestException('Payout account is required');
    }
  }

  private assertFreshProof(
    token: VerifiedFirebaseToken,
    challengeCreatedAt: Date,
    channel: WithdrawalAuthorizationChannel,
  ) {
    if (!token.authTime || token.authTime * 1000 < challengeCreatedAt.getTime() - 60_000) {
      throw new UnauthorizedException('Firebase verification is not fresh enough');
    }
    if (channel === 'EMAIL' && !token.emailVerified) {
      throw new UnauthorizedException('Firebase email is not verified');
    }
  }

  private assertMatchingContact(
    token: VerifiedFirebaseToken,
    user: { email: string | null; phone: string | null },
    channel: WithdrawalAuthorizationChannel,
  ) {
    if (channel === 'EMAIL') {
      if (!token.email || !user.email || token.email.trim().toLowerCase() !== user.email.trim().toLowerCase()) {
        throw new UnauthorizedException('Firebase contact does not match the current user');
      }
      return;
    }
    if (!token.phoneNumber || !user.phone || this.normalizePhone(token.phoneNumber) !== this.normalizePhone(user.phone)) {
      throw new UnauthorizedException('Firebase contact does not match the current user');
    }
  }

  private normalizePhone(value: string) {
    const digits = value.replace(/\D/g, '');
    if (digits.startsWith('84')) return digits;
    if (digits.startsWith('0')) return `84${digits.slice(1)}`;
    return digits;
  }

  private async recordFailure(challengeId: string, currentFailures: number, now: Date) {
    const failedAttempts = currentFailures + 1;
    await this.prisma.withdrawalAuthorization.update({
      where: { id: challengeId },
      data: {
        failedAttempts,
        ...(failedAttempts >= 5 ? { lockedUntil: new Date(now.getTime() + 30 * 60_000) } : {}),
      },
    });
  }
}
