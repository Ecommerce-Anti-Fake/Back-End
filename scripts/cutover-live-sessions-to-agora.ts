import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { assertUatRuntimeDatabaseTarget } from './uat/uat-safety';

assertUatRuntimeDatabaseTarget();
import { buildAgoraCutoverPlan } from '../libs/live-commerce/src/application/agora-rtc';

const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) throw new Error('DATABASE_URL is not configured');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const migratedSessions = await prisma.$transaction(
    async (transaction) => {
      await transaction.$executeRawUnsafe(
        'LOCK TABLE "live_commerce_session" IN SHARE ROW EXCLUSIVE MODE',
      );
      const legacySessions = await transaction.liveCommerceSession.findMany({
        where: { streamProvider: 'CLOUDFLARE_STREAM' },
        select: { id: true, status: true },
        orderBy: { id: 'asc' },
      });
      const plan = buildAgoraCutoverPlan(legacySessions);

      for (const session of plan) {
        const result = await transaction.liveCommerceSession.updateMany({
          where: {
            id: session.sessionId,
            status: 'SCHEDULED',
            streamProvider: 'CLOUDFLARE_STREAM',
          },
          data: {
            streamProvider: 'AGORA_RTC',
            streamProviderSessionId: session.channelName,
            streamIngestUrl: null,
            playbackUrl: null,
            streamLatencyTargetMs: 1000,
            providerStatus: 'READY',
            providerEventAt: new Date(),
            providerEventType: 'agora.cutover.ready',
            providerErrorCode: null,
            providerErrorMessage: null,
            recordingUrl: null,
            recordingRetentionDays: null,
          },
        });
        if (result.count !== 1) {
          throw new Error(
            `Concurrent update detected for live session ${session.sessionId}`,
          );
        }
      }

      return plan;
    },
    {
      isolationLevel: 'Serializable',
      maxWait: 10_000,
      timeout: 60_000,
    },
  );

  process.stdout.write(
    `${JSON.stringify({
      migratedScheduledSessions: migratedSessions.length,
      sessionIds: migratedSessions.map((session) => session.sessionId),
    })}\n`,
  );
}

main()
  .finally(() => prisma.$disconnect())
  .catch((error) => {
    process.stderr.write(
      `Agora live-session cutover failed: ${
        error instanceof Error ? error.message : 'unknown error'
      }\n`,
    );
    process.exitCode = 1;
  });
