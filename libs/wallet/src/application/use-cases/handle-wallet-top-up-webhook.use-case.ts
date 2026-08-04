import { BadRequestException, Injectable } from '@nestjs/common';
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
    if (providerAmount && !providerAmount.eq(topUp.amount)) throw new BadRequestException('Số tiền webhook PayOS không khớp giao dịch nạp ví.');

    const dataCode = typeof input.data.code === 'string' ? input.data.code.trim() : '';
    if (!(input.success && input.code === '00' && dataCode === '00')) {
      return this.markTopUpFailed(topUp.id);
    }

    return this.settlePaidTopUp(topUp.id);
  }

  async reconcile(input: { userId: string; paymentLinkId: string }) {
    const paymentLinkId = input.paymentLinkId.trim();
    const topUp = await this.prisma.walletTopUp.findFirst({
      where: { paymentLinkId, wallet: { userId: input.userId } },
    });
    if (!topUp) throw new BadRequestException('Không tìm thấy giao dịch nạp ví của bạn.');
    if (topUp.status === 'PAID') {
      return { success: true, reconciled: true, status: 'PAID', message: 'Giao dịch nạp ví đã được ghi nhận.' };
    }

    const provider = await this.payOS.getPaymentLink(paymentLinkId);
    if (provider.amount !== Number(topUp.amount)) {
      throw new BadRequestException('Số tiền link PayOS không khớp giao dịch nạp ví.');
    }

    if (provider.status === 'PAID') {
      if (provider.amountPaid !== Number(topUp.amount)) {
        throw new BadRequestException('Số tiền PayOS đã thanh toán không khớp giao dịch nạp ví.');
      }
      return {
        ...(await this.settlePaidTopUp(topUp.id)),
        reconciled: true,
        status: 'PAID',
      };
    }

    return {
      success: true,
      reconciled: false,
      status: provider.status,
      message: 'PayOS chưa ghi nhận thanh toán.',
    };
  }

  private async settlePaidTopUp(topUpId: string) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.walletTopUp.findUnique({ where: { id: topUpId } });
      if (!current || current.status !== 'PENDING') return { success: true, message: 'Webhook nạp ví đã được xử lý.' };
      await this.walletRepository.executeTransactionInTransaction(tx, { transactionCode: `TOP_UP:${current.id}`, transactionType: WalletTransactionType.TOP_UP, idempotencyKey: `WALLET_TOP_UP:${current.id}:CREDIT`, amount: current.amount, referenceType: 'WALLET_TOP_UP', referenceId: current.id, description: `Nạp tiền vào ví ${current.walletId}`, allowUnbalanced: true, entries: [{ walletId: current.walletId, direction: WalletEntryDirection.CREDIT, balanceType: WalletBalanceType.AVAILABLE, amount: current.amount }] });
      await this.codShopSettlementService.settleOutstandingForWalletInTransaction(tx, current.walletId);
      await tx.walletTopUp.update({ where: { id: current.id }, data: { status: 'PAID', paidAt: new Date() } });
      return { success: true, message: 'Nạp tiền vào ví thành công.' };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private async markTopUpFailed(topUpId: string) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.walletTopUp.findUnique({ where: { id: topUpId } });
      if (!current || current.status !== 'PENDING') return { success: true, message: 'Webhook nạp ví đã được xử lý.' };
      await tx.walletTopUp.update({ where: { id: current.id }, data: { status: 'FAILED' } });
      return { success: true, message: 'Đã ghi nhận nạp ví thất bại.' };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
