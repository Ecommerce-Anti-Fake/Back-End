import {
  INestApplication,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { getRequestPerformanceContext } from '@common/performance/request-context';
import { assertUatRuntimeDatabaseTarget } from '../../../../scripts/uat/uat-safety';

type PrismaQueryEvent = {
  duration: number;
  target: string;
};

type PrismaQueryEventSource = {
  $on: (event: 'query', listener: (event: PrismaQueryEvent) => void) => unknown;
};

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  constructor(configService: ConfigService) {
    assertUatRuntimeDatabaseTarget();
    const connectionString = configService.get<string>('DATABASE_URL');

    if (!connectionString) {
      throw new Error('DATABASE_URL is not set');
    }

    const slowQueryThresholdMs = positiveInteger(
      configService.get<string>('PRISMA_SLOW_QUERY_THRESHOLD_MS'),
      200,
    );

    super({
      adapter: new PrismaPg({ connectionString }),
      log: [{ emit: 'event', level: 'query' }],
    });

    // Prisma 7's adapter-generated client types expose query events as `never`,
    // although the runtime emitter supports the documented query event.
    (this as unknown as PrismaQueryEventSource).$on('query', (event) => {
      const context = getRequestPerformanceContext();
      context?.recordQuery(event.duration);

      if (event.duration < slowQueryThresholdMs) {
        return;
      }

      this.logger.warn(
        JSON.stringify({
          event: 'db.query.slow',
          requestId: context?.requestId ?? null,
          durationMs: event.duration,
          target: event.target,
        }),
      );
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', () => {
      void app.close();
    });
  }
}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? '', 10);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
