import 'dotenv/config';
import { createHash } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { assertUatRuntimeDatabaseTarget } from './uat/uat-safety';

// Audit only. There is deliberately no apply/cleanup mode.
async function main() {
  const args = process.argv.slice(2);
  if (
    args.some((arg) => !['--dry-run', '--provider'].includes(arg)) ||
    !args.includes('--dry-run')
  ) {
    throw new Error(
      'Usage: npm run payos:audit -- --dry-run [--provider] (read-only; no cleanup mode)',
    );
  }
  assertUatRuntimeDatabaseTarget();
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  try {
    const report = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const orders = await tx.paymentIntent.findMany({
        where: { paymentMethod: 'PAYOS', paymentStatus: 'PENDING' },
        select: { id: true, providerRef: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
        take: 100,
      });
      const wallets = await tx.walletTopUp.findMany({
        where: { status: 'PENDING' },
        select: { id: true, paymentLinkId: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
        take: 100,
      });
      return {
        pendingOrders: await tx.paymentIntent.count({
          where: { paymentMethod: 'PAYOS', paymentStatus: 'PENDING' },
        }),
        pendingWalletTopUps: await tx.walletTopUp.count({
          where: { status: 'PENDING' },
        }),
        rows: [
          ...orders.map((row) => ({
            kind: 'ORDER',
            id: row.id,
            link: row.providerRef?.split(':')[1],
            createdAt: row.createdAt,
          })),
          ...wallets.map((row) => ({
            kind: 'WALLET_TOP_UP',
            id: row.id,
            link: row.paymentLinkId,
            createdAt: row.createdAt,
          })),
        ],
      };
    });
    const rows: object[] = [];
    for (const row of report.rows) {
      let providerStatus = 'NOT_REQUESTED';
      let providerHttpStatus: number | null = null;
      let providerCode: string | null = null;
      if (args.includes('--provider') && row.link) {
        const clientId = process.env.PAYOS_CLIENT_ID;
        const apiKey = process.env.PAYOS_API_KEY;
        if (!clientId || !apiKey)
          throw new Error('PayOS credentials are required for provider audit');
        try {
          const response = await fetch(
            `${process.env.PAYOS_API_BASE_URL || 'https://api-merchant.payos.vn'}/v2/payment-requests/${encodeURIComponent(row.link)}`,
            {
              headers: { 'x-client-id': clientId, 'x-api-key': apiKey },
              signal: AbortSignal.timeout(10000),
            },
          );
          const payload = (await response.json()) as {
            code?: string;
            data?: { status?: string };
          };
          providerHttpStatus = response.status;
          providerCode = /^[a-zA-Z0-9_-]{1,16}$/.test(payload.code ?? '')
            ? payload.code!
            : null;
          providerStatus =
            response.ok && payload.code === '00'
              ? payload.data?.status || 'UNKNOWN'
              : 'PROVIDER_ERROR';
        } catch {
          providerStatus = 'PROVIDER_UNAVAILABLE';
        }
      }
      rows.push({
        kind: row.kind,
        record: createHash('sha256').update(row.id).digest('hex').slice(0, 12),
        createdAt: row.createdAt,
        hasPaymentLink: Boolean(row.link),
        providerStatus,
        providerHttpStatus,
        providerCode,
      });
    }
    process.stdout.write(
      JSON.stringify(
        {
          dryRun: true,
          writes: 0,
          pendingOrders: report.pendingOrders,
          pendingWalletTopUps: report.pendingWalletTopUps,
          limitPerKind: 100,
          sampled: rows.length,
          rows,
        },
        null,
        2,
      ) + '\n',
    );
  } finally {
    await prisma.$disconnect();
  }
}
void main().catch(() => {
  // Never print driver/provider errors: they can contain connection details.
  process.stderr.write(
    'PayOS read-only audit failed. Verify flags, database target, connectivity and credentials. No cleanup was performed.\n',
  );
  process.exitCode = 1;
});
