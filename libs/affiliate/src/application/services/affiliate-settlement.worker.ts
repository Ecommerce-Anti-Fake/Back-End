import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SettleMatureAffiliateCommissionsUseCase } from '../use-cases';

@Injectable()
export class AffiliateSettlementWorker implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(AffiliateSettlementWorker.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly settleMatureCommissions: SettleMatureAffiliateCommissionsUseCase,
  ) {}

  onApplicationBootstrap() {
    const configured = Number(
      this.configService.get<string | number>('AFFILIATE_SETTLEMENT_INTERVAL_MS') ?? 3_600_000,
    );
    const intervalMs = Number.isFinite(configured)
      ? Math.max(60_000, configured)
      : 3_600_000;
    void this.run();
    this.timer = setInterval(() => void this.run(), intervalMs);
    this.timer.unref();
  }

  onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer);
  }

  private async run() {
    if (this.running) return;
    this.running = true;
    try {
      const result = await this.settleMatureCommissions.execute();
      if (result.paid > 0) {
        this.logger.log(`Paid ${result.paid} of ${result.scanned} matured affiliate commissions`);
      }
      if (result.failed > 0) {
        this.logger.warn(`${result.failed} affiliate commission settlements failed and will be retried`);
      }
    } catch (error) {
      this.logger.error('Automatic affiliate settlement failed', error instanceof Error ? error.stack : undefined);
    } finally {
      this.running = false;
    }
  }
}
