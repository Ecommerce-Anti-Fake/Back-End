import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { loadUatEnv } from '../../scripts/uat/load-uat-env';
import {
  assertUatDatabaseTarget,
  requiredUatSecret,
} from '../../scripts/uat/uat-safety';
import {
  encryptSeedAccountNumber,
  id,
  money,
  recentDate,
} from '../seeds/00-utils';

loadUatEnv();
assertUatDatabaseTarget();
const connectionString = requiredUatSecret('DATABASE_URL');
const SEED_WITHDRAWAL_PREFIX = 'UAT-WITHDRAWAL-';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

function productionBankBin(bankCode: string, bankBin: string) {
  return bankCode === 'VCB' && bankBin === '970415' ? '970436' : bankBin;
}

function productionSnapshot(accountNumberEncrypted: string) {
  if (accountNumberEncrypted.startsWith('v1:')) return accountNumberEncrypted;
  const legacySeedAccount = /^seed-encrypted-(\d{6,19})$/.exec(
    accountNumberEncrypted,
  );
  if (legacySeedAccount) return encryptSeedAccountNumber(legacySeedAccount[1]);
  throw new Error(
    'Payout account does not contain a supported encrypted account number',
  );
}

async function removeSeedWithdrawals() {
  await prisma.$transaction(async (tx) => {
    const withdrawals = await tx.walletWithdrawal.findMany({
      where: { idempotencyKey: { startsWith: SEED_WITHDRAWAL_PREFIX } },
      select: { id: true },
    });
    const withdrawalIds = withdrawals.map((item) => item.id);
    if (!withdrawalIds.length) return;

    const transactions = await tx.walletTransaction.findMany({
      where: {
        referenceType: 'WALLET_WITHDRAWAL',
        referenceId: { in: withdrawalIds },
      },
      select: { id: true },
    });
    const transactionIds = transactions.map((item) => item.id);

    await tx.auditLog.deleteMany({
      where: {
        targetType: 'WALLET_WITHDRAWAL',
        targetId: { in: withdrawalIds },
      },
    });
    if (transactionIds.length) {
      await tx.walletLedgerEntry.deleteMany({
        where: { transactionId: { in: transactionIds } },
      });
      await tx.walletTransaction.deleteMany({
        where: { id: { in: transactionIds } },
      });
    }
    await tx.walletWithdrawal.deleteMany({
      where: { id: { in: withdrawalIds } },
    });
  });
}

async function main() {
  await removeSeedWithdrawals();

  const admin = await prisma.user.findFirst({
    where: { email: 'admin-uat@antifake.local' },
    select: { id: true },
  });
  if (!admin) throw new Error('UAT admin alias was not found');

  const payoutAccounts = await prisma.payoutAccount.findMany({
    where: { ownerType: 'SHOP', disabledAt: null },
    orderBy: { createdAt: 'asc' },
    take: 4,
    select: {
      id: true,
      bankBin: true,
      bankCode: true,
      bankName: true,
      accountNumberEncrypted: true,
      accountNumberLast4: true,
      accountNumberLength: true,
      declaredAccountHolder: true,
      resolvedAccountHolder: true,
      shop: { select: { id: true, ownerUserId: true, shopName: true } },
    },
  });
  if (payoutAccounts.length < 4 || payoutAccounts.some((item) => !item.shop)) {
    throw new Error(
      'At least four active shop payout accounts are required before seeding withdrawals',
    );
  }

  const wallets = await prisma.wallet.findMany({
    where: {
      ownerType: 'SHOP',
      currency: 'VND',
      shopId: { in: payoutAccounts.map((item) => item.shop!.id) },
    },
    select: { id: true, shopId: true },
  });
  const walletByShopId = new Map(wallets.map((item) => [item.shopId, item.id]));

  type WithdrawalFixture = {
    amount: number;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';
    approvedAt?: Date;
    completedAt?: Date;
    transferReference?: string;
    rejectionReason?: string;
    processedAt?: Date;
  };
  const fixtures: WithdrawalFixture[] = [
    { amount: 250000, status: 'PENDING' as const },
    {
      amount: 200000,
      status: 'PROCESSING' as const,
      approvedAt: recentDate(2),
    },
    {
      amount: 150000,
      status: 'COMPLETED' as const,
      approvedAt: recentDate(4),
      completedAt: recentDate(2),
      transferReference: 'UAT-BANK-3',
    },
    {
      amount: 100000,
      status: 'REJECTED' as const,
      rejectionReason: 'UAT fixture rejected withdrawal for Admin read view.',
      processedAt: recentDate(2),
    },
  ];

  for (const [index, fixture] of fixtures.entries()) {
    const payout = payoutAccounts[index];
    const shop = payout.shop!;
    const walletId = walletByShopId.get(shop.id);
    if (!walletId) throw new Error(`Shop wallet was not found for ${shop.id}`);

    const bankBin = productionBankBin(payout.bankCode, payout.bankBin);
    const processedAt =
      fixture.status === 'COMPLETED'
        ? fixture.completedAt
        : fixture.status === 'REJECTED'
          ? fixture.processedAt
          : null;
    await prisma.walletWithdrawal.create({
      data: {
        id: id(),
        walletId,
        payoutAccountId: payout.id,
        requestedByUserId: shop.ownerUserId,
        processedByUserId: fixture.status === 'PENDING' ? null : admin.id,
        idempotencyKey: `${SEED_WITHDRAWAL_PREFIX}${index + 1}`,
        amount: money(fixture.amount),
        bankBin,
        bankCode: payout.bankCode,
        bankName: payout.bankName,
        accountNumberEncryptedSnapshot: productionSnapshot(
          payout.accountNumberEncrypted,
        ),
        accountNumberLast4: payout.accountNumberLast4,
        accountNumberLength: payout.accountNumberLength,
        accountHolder: (
          payout.resolvedAccountHolder ||
          payout.declaredAccountHolder ||
          shop.shopName
        ).toUpperCase(),
        status: fixture.status,
        transferReference:
          fixture.status === 'COMPLETED' ? fixture.transferReference : null,
        rejectionReason:
          fixture.status === 'REJECTED' ? fixture.rejectionReason : null,
        approvedAt: fixture.approvedAt ?? null,
        completedAt:
          fixture.status === 'COMPLETED' ? fixture.completedAt : null,
        processedAt,
      },
    });
  }

  console.log('UAT withdrawal fixtures replaced: 4 synthetic records.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
