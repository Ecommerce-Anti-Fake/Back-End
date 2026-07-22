import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { PayoutAccountSecurityService } from '../libs/wallet/src/domain/payout-account-security';

const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) throw new Error('DATABASE_URL is not configured');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const security = new PayoutAccountSecurityService(new ConfigService(process.env));

async function main() {
  let encryptedCount = 0;
  while (true) {
    const rows = await prisma.walletWithdrawal.findMany({
      where: { accountNumber: { not: null }, accountNumberEncryptedSnapshot: null },
      select: { id: true, accountNumber: true },
      take: 100,
      orderBy: { id: 'asc' },
    });
    if (rows.length === 0) break;

    for (const row of rows) {
      if (!row.accountNumber) continue;
      const normalized = security.normalizeAccountNumber(row.accountNumber);
      await prisma.walletWithdrawal.update({
        where: { id: row.id },
        data: {
          accountNumberEncryptedSnapshot: security.encryptAccountNumber(normalized),
          accountNumberLast4: normalized.slice(-4),
          accountNumberLength: normalized.length,
          accountNumber: null,
        },
      });
      encryptedCount += 1;
    }
  }
  process.stdout.write(JSON.stringify({ encryptedWithdrawals: encryptedCount }));
}

main()
  .finally(() => prisma.$disconnect())
  .catch((error) => {
    process.stderr.write(`Legacy withdrawal encryption failed: ${error instanceof Error ? error.message : 'unknown error'}\n`);
    process.exitCode = 1;
  });
