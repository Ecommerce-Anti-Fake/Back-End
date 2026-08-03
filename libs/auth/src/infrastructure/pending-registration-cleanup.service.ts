import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { RegistrationRepository } from './persistence';

const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;

@Injectable()
export class PendingRegistrationCleanupService
  implements OnModuleInit, OnModuleDestroy
{
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly registrationRepository: RegistrationRepository,
  ) {}

  onModuleInit() {
    void this.cleanup();
    this.timer = setInterval(() => void this.cleanup(), CLEANUP_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async cleanup() {
    try {
      await this.registrationRepository.deleteExpiredPendingRegistrations();
    } catch {
      // Cleanup is best-effort; registration requests remain authoritative.
    }
  }
}
