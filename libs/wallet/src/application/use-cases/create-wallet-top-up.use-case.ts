import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';
import { WalletRepository } from '../../infrastructure/persistence/wallet.repository';
import { PayOSTopUpService } from '../../infrastructure/payos-top-up.service';

@Injectable()
export class CreateWalletTopUpUseCase {
  constructor(private readonly prisma: PrismaService, private readonly walletRepository: WalletRepository, private readonly payOS: PayOSTopUpService) {}

  async execute(input: {
    userId: string;
    requesterRole?: string;
    shopId?: string;
    amount: string;
    idempotencyKey?: string;
  }) {
    if (
      input.shopId &&
      !(await this.walletRepository.canAccessShopWallet(
        input.shopId,
        input.userId,
        input.requesterRole ?? 'user',
      ))
    ) {
      throw new ForbiddenException('You cannot access this shop wallet');
    }
    const clientKey = input.idempotencyKey?.trim();
    const idempotencyKey = input.shopId
      ? `SHOP_TOP_UP:${input.shopId}:${clientKey || Date.now()}`
      : `WALLET_TOP_UP:${input.userId}:${clientKey || Date.now()}`;
    const existing = await this.prisma.walletTopUp.findUnique({ where: { idempotencyKey } });
    if (existing) {
      const owner = await this.prisma.wallet.findUnique({ where: { id: existing.walletId } });
      if (!owner || (input.shopId ? owner.shopId !== input.shopId : owner.userId !== input.userId || owner.shopId !== null)) throw new ForbiddenException('Top-up ownership mismatch');
      return this.toResponse(existing);
    }

    const amount = new Prisma.Decimal(input.amount);
    if (amount.lte(0) || !amount.eq(amount.toDecimalPlaces(0))) {
      throw new BadRequestException('Số tiền nạp phải là số nguyên VND lớn hơn 0.');
    }
    const wallet = input.shopId
      ? await this.walletRepository.findOrCreateShopWallet(input.shopId, 'VND')
      : await this.walletRepository.findOrCreateUserWallet(input.userId, 'VND');
    const payment = await this.payOS.createPaymentLink({
      amount,
      idempotencyKey,
      ...(input.shopId ? { destination: 'SHOP' as const } : {}),
    });
    try {
      const topUp = await this.prisma.walletTopUp.create({ data: { walletId: wallet.id, idempotencyKey, orderCode: payment.orderCode, paymentLinkId: payment.paymentLinkId, amount, currency: 'VND', checkoutUrl: payment.checkoutUrl, qrCode: payment.qrCode, expiresAt: payment.expiresAt } });
      return this.toResponse(topUp);
    } catch (error) {
      const raced = await this.prisma.walletTopUp.findUnique({ where: { idempotencyKey } });
      if (raced) return this.toResponse(raced);
      throw error;
    }
  }

  private toResponse(topUp: { id: string; paymentLinkId: string; checkoutUrl: string; amount: Prisma.Decimal; currency: string; status: string; qrCode?: string | null; expiresAt?: Date | null }) {
    const active = topUp.status === 'PENDING' && !!topUp.expiresAt && topUp.expiresAt.getTime() > Date.now();
    return { canResume: active, qrCode: active ? topUp.qrCode ?? null : null, expiresAt: topUp.expiresAt?.toISOString() ?? null, serverTime: new Date().toISOString(), topUpId: topUp.id, paymentLinkId: topUp.paymentLinkId, checkoutUrl: active ? topUp.checkoutUrl : null, amount: topUp.amount.toFixed(2), currency: topUp.currency, status: topUp.status };
  }
}
