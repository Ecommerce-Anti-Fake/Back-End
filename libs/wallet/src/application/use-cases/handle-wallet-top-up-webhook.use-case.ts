import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma, WalletBalanceType, WalletEntryDirection, WalletTransactionType } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';
import { WalletRepository } from '../../infrastructure/persistence/wallet.repository';
import { PayOSTopUpService } from '../../infrastructure/payos-top-up.service';
import { CodShopSettlementService } from '../services';

@Injectable()
export class HandleWalletTopUpWebhookUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletRepository: WalletRepository,
    private readonly payOS: PayOSTopUpService,
    private readonly codShopSettlementService: CodShopSettlementService,
  ) {}

  async execute(input: { code: string; desc: string; success: boolean; signature: string; data: Record<string, unknown> }) {
    if (!this.payOS.verifyWebhook(input.data, input.signature)) throw new BadRequestException('Chữ ký webhook PayOS không hợp lệ.');
    const paymentLinkId = String(input.data.paymentLinkId ?? '').trim();
    if (!paymentLinkId) throw new BadRequestException('Webhook PayOS thiếu paymentLinkId.');
    const topUp = await this.prisma.walletTopUp.findUnique({ where: { paymentLinkId } });
    if (!topUp) throw new BadRequestException('Không tìm thấy giao dịch nạp ví.');
    const providerAmount = input.data.amount === undefined ? null : new Prisma.Decimal(String(input.data.amount));
    if (!providerAmount || !providerAmount.eq(topUp.amount)) throw new BadRequestException('Số tiền webhook PayOS không khớp giao dịch nạp ví.');

    const dataCode = typeof input.data.code === 'string' ? input.data.code.trim() : '';
    if (!(input.success && input.code === '00' && dataCode === '00')) {
      return this.markTopUpFailed(topUp.id);
    }

    return this.settlePaidTopUp(topUp.id);
  }

  async reconcile(input: { userId: string; paymentLinkId: string; shopId?: string; requesterRole?: string }) {
    const topUp = await this.findOwned(input);
    const status = await this.reconcileRecord(topUp);
    return { success: true, reconciled: status === 'PAID', status };
  }

  async assertAccess(input: { userId: string; shopId?: string; requesterRole?: string }) {
    if (input.shopId && !await this.walletRepository.canAccessShopWallet(input.shopId, input.userId, input.requesterRole ?? 'user')) throw new ForbiddenException('You cannot access this shop wallet');
  }

  async findOwned(input: { userId: string; paymentLinkId: string; shopId?: string; requesterRole?: string }) {
    await this.assertAccess(input);
    const topUp = await this.prisma.walletTopUp.findFirst({ where: { paymentLinkId: input.paymentLinkId.trim(), wallet: input.shopId ? { shopId: input.shopId } : { userId: input.userId, shopId: null } } });
    if (!topUp) throw new BadRequestException('Top-up not found for this wallet');
    return topUp;
  }

  async reconcileRecord(topUp: { id: string; paymentLinkId: string; amount: Prisma.Decimal; status: string; expiresAt?: Date | null }, cancel = false) {
    if (topUp.status === 'PAID') return 'PAID';
    const provider = cancel ? await this.payOS.cancelPaymentLink(topUp.paymentLinkId) : await this.payOS.getPaymentLink(topUp.paymentLinkId);
    if (!new Prisma.Decimal(provider.amount).eq(topUp.amount)) throw new BadRequestException('PayOS amount mismatch');
    if (provider.status === 'PAID') {
      if (!new Prisma.Decimal(provider.amountPaid).eq(topUp.amount)) throw new BadRequestException('PayOS paid amount mismatch');
      await this.settlePaidTopUp(topUp.id);
    } else {
      const expired = topUp.expiresAt && topUp.expiresAt.getTime() <= Date.now();
      const status = provider.status === 'CANCELLED' ? 'CANCELLED' : provider.status === 'EXPIRED' || (expired && provider.status === 'PENDING') ? 'EXPIRED' : null;
      // Compare-and-set prevents a concurrent webhook's PAID from being downgraded.
      await this.prisma.walletTopUp.updateMany({ where: { id: topUp.id, status: { not: 'PAID' } }, data: { ...(status ? { status: status as 'CANCELLED' | 'EXPIRED' } : {}), lastReconciledAt: new Date() } });
    }
    const current = await this.prisma.walletTopUp.findUniqueOrThrow({ where: { id: topUp.id } });
    return current.status;
  }

  private async settlePaidTopUp(topUpId: string) {
    return this.withSerializableRetry(async (tx) => {
      const current = await tx.walletTopUp.findUnique({ where: { id: topUpId } });
      if (!current || current.status === 'PAID') return { success: true, message: 'Webhook nạp ví đã được xử lý.' };
      await this.walletRepository.executeTransactionInTransaction(tx, { transactionCode: `TOP_UP:${current.id}`, transactionType: WalletTransactionType.TOP_UP, idempotencyKey: `WALLET_TOP_UP:${current.id}:CREDIT`, amount: current.amount, referenceType: 'WALLET_TOP_UP', referenceId: current.id, description: `Nạp tiền vào ví ${current.walletId}`, allowUnbalanced: true, entries: [{ walletId: current.walletId, direction: WalletEntryDirection.CREDIT, balanceType: WalletBalanceType.AVAILABLE, amount: current.amount }] });
      await this.codShopSettlementService.settleOutstandingForWalletInTransaction(tx, current.walletId);
      await tx.walletTopUp.update({ where: { id: current.id }, data: { status: 'PAID', paidAt: new Date() } });
      return { success: true, message: 'Nạp tiền vào ví thành công.' };
    });
  }

  private async withSerializableRetry<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try { return await this.prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
      catch (error) { if (attempt >= 3 || !error || typeof error !== 'object' || !('code' in error) || !['P2034', 'P2002'].includes(String(error.code))) throw error; }
    }
  }

  private async markTopUpFailed(topUpId: string) {
    return this.withSerializableRetry(async (tx) => {
      const current = await tx.walletTopUp.findUnique({ where: { id: topUpId } });
      if (!current || current.status !== 'PENDING') return { success: true, message: 'Webhook nạp ví đã được xử lý.' };
      await tx.walletTopUp.update({ where: { id: current.id }, data: { status: 'FAILED' } });
      return { success: true, message: 'Đã ghi nhận nạp ví thất bại.' };
    });
  }
}
