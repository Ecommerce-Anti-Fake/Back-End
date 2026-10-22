import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaService } from '@database/prisma/prisma.service';
import { HandleWalletTopUpWebhookUseCase } from './handle-wallet-top-up-webhook.use-case';

type Owner = { userId: string; shopId?: string; requesterRole?: string };

@Injectable()
export class WalletTopUpLifecycleService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(WalletTopUpLifecycleService.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  constructor(
    private readonly prisma: PrismaService,
    private readonly handler: HandleWalletTopUpWebhookUseCase,
  ) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => {
      void this.reconcileDue().catch(() =>
        this.logger.warn('Wallet PayOS reconciliation batch failed'),
      );
    }, 60_000);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async list(owner: Owner) {
    // Authorization uses the same ownership boundary as resume, even for an empty list.
    await this.handler.assertAccess(owner);
    const rows = await this.prisma.walletTopUp.findMany({
      where: {
        wallet: owner.shopId
          ? { shopId: owner.shopId }
          : { userId: owner.userId, shopId: null },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((row) => this.response(row, owner.shopId));
  }
  async resume(input: Owner & { paymentLinkId: string }, cancel = false) {
    const row = await this.handler.findOwned(input);
    await this.handler.reconcileRecord(row, cancel && row.status !== 'PAID');
    const current = await this.prisma.walletTopUp.findUniqueOrThrow({
      where: { id: row.id },
    });
    return this.response(current, input.shopId);
  }

  async reconcileDue() {
    if (this.running) return;
    this.running = true;
    try {
      // Nullable expiry deliberately excludes historical records until their dry-run audit is approved.
      const rows = await this.prisma.walletTopUp.findMany({
        where: {
          expiresAt: { not: null },
          status: { not: 'PAID' },
          OR: [
            { status: 'PENDING' },
            { expiresAt: { gte: new Date(Date.now() - 7 * 86400_000) } },
          ],
        },
        orderBy: { lastReconciledAt: { sort: 'asc', nulls: 'first' } },
        take: 50,
      });
      for (const row of rows) {
        try {
          await this.handler.reconcileRecord(row);
        } catch {
          this.logger.warn(
            'Wallet PayOS reconciliation requires retry for top-up ' + row.id,
          );
          await this.prisma.walletTopUp.updateMany({
            where: { id: row.id, status: { not: 'PAID' } },
            data: { lastReconciledAt: new Date() },
          });
        }
      }
    } finally {
      this.running = false;
    }
  }

  private response(
    row: {
      id: string;
      paymentLinkId: string;
      checkoutUrl: string;
      amount: { toFixed: (n: number) => string };
      currency: string;
      status: string;
      expiresAt: Date | null;
      qrCode: string | null;
    },
    shopId?: string,
  ) {
    const expired = row.expiresAt && row.expiresAt.getTime() <= Date.now();
    const active = row.status === 'PENDING' && !!row.expiresAt && !expired;
    return {
      canResume: active,
      message:
        !row.expiresAt && row.status === 'PENDING'
          ? 'Th\u1eddi h\u1ea1n giao d\u1ecbch c\u0169 ch\u01b0a \u0111\u01b0\u1ee3c x\u00e1c minh. Vui l\u00f2ng h\u1ee7y y\u00eau c\u1ea7u c\u0169 tr\u01b0\u1edbc khi t\u1ea1o y\u00eau c\u1ea7u m\u1edbi.'
          : undefined,
      topUpId: row.id,
      paymentLinkId: row.paymentLinkId,
      checkoutUrl: active ? row.checkoutUrl : null,
      qrCode: active ? row.qrCode : null,
      expiresAt: row.expiresAt?.toISOString() ?? null,
      serverTime: new Date().toISOString(),
      amount: row.amount.toFixed(2),
      currency: row.currency,
      status: expired && row.status === 'PENDING' ? 'EXPIRED' : row.status,
      ...(shopId ? { shopId } : {}),
    };
  }
}
