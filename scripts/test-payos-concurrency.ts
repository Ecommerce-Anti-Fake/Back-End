import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma, WalletOwnerType } from '@prisma/client';
import { PrismaService } from '../libs/database/src/prisma/prisma.service';
import { WalletRepository } from '../libs/wallet/src/infrastructure/persistence/wallet.repository';
import { HandleWalletTopUpWebhookUseCase } from '../libs/wallet/src/application/use-cases/handle-wallet-top-up-webhook.use-case';
import { PayOSTopUpService } from '../libs/wallet/src/infrastructure/payos-top-up.service';
import { CodShopSettlementService } from '../libs/wallet/src/application/services';

// This script never reads .env or DATABASE_URL. It can only mutate the disposable CI DB.
async function main() {
  const connectionString = process.env.PAYOS_INTEGRATION_DATABASE_URL;
  assert(
    connectionString,
    'PAYOS_INTEGRATION_DATABASE_URL is required; no fallback is allowed',
  );
  const target = new URL(connectionString);
  assert(
    ['postgres:', 'postgresql:'].includes(target.protocol),
    'PostgreSQL is required',
  );
  assert(
    ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname),
    'Only localhost integration database is permitted',
  );
  assert.equal(
    target.pathname,
    '/payos_ci',
    'Only the disposable payos_ci database is permitted',
  );
  assert(!target.searchParams.has('host'), 'Host overrides are forbidden');

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  const database = prisma as PrismaService;
  const repository = new WalletRepository(database);
  const provider = {
    verifyWebhook: () => true,
    getPaymentLink: () =>
      Promise.resolve({
        paymentLinkId: '',
        status: 'PENDING',
        amount: 10000,
        amountPaid: 0,
      }),
    cancelPaymentLink: () =>
      Promise.resolve({
        paymentLinkId: '',
        status: 'CANCELLED',
        amount: 10000,
        amountPaid: 0,
      }),
  } as unknown as PayOSTopUpService;
  const cod = {
    settleOutstandingForWalletInTransaction: () => Promise.resolve(undefined),
  } as unknown as CodShopSettlementService;
  const handler = new HandleWalletTopUpWebhookUseCase(
    database,
    repository,
    provider,
    cod,
  );
  const walletIds: string[] = [];
  const topUpIds: string[] = [];
  try {
    const fixture = async (status: 'PENDING' | 'EXPIRED' = 'PENDING') => {
      const suffix = randomUUID();
      const wallet = await prisma.wallet.create({
        data: {
          walletCode: 'PAYOS_CI_' + suffix,
          platformCode: 'PAYOS_CI_' + suffix,
          ownerType: WalletOwnerType.PLATFORM,
        },
      });
      walletIds.push(wallet.id);
      const topUp = await prisma.walletTopUp.create({
        data: {
          walletId: wallet.id,
          idempotencyKey: 'PAYOS_CI_' + suffix,
          orderCode: suffix,
          paymentLinkId: suffix,
          amount: new Prisma.Decimal(10000),
          checkoutUrl: 'https://payos.test/' + suffix,
          expiresAt: new Date(Date.now() - 1000),
          status,
        },
      });
      topUpIds.push(topUp.id);
      const webhook = {
        code: '00',
        desc: 'CI fake verified provider',
        success: true,
        signature: 'ci-only',
        data: { paymentLinkId: topUp.paymentLinkId, amount: 10000, code: '00' },
      };
      return { wallet, topUp, webhook };
    };
    const assertOneCredit = async (topUpId: string, walletId: string) => {
      const actual = await prisma.walletTopUp.findUniqueOrThrow({
        where: { id: topUpId },
      });
      assert.equal(actual.status, 'PAID');
      const wallet = await prisma.wallet.findUniqueOrThrow({
        where: { id: walletId },
      });
      assert.equal(wallet.availableBalance.toFixed(2), '10000.00');
      assert.equal(
        await prisma.walletTransaction.count({
          where: { idempotencyKey: 'WALLET_TOP_UP:' + topUpId + ':CREDIT' },
        }),
        1,
      );
      assert.equal(
        await prisma.walletLedgerEntry.count({ where: { walletId } }),
        1,
      );
    };

    const completeAll = async (operations: Promise<unknown>[]) => {
      const results = await Promise.allSettled(operations);
      for (const result of results)
        if (result.status === 'rejected') throw result.reason;
    };
    const duplicate = await fixture();
    await completeAll(
      Array.from({ length: 4 }, () => handler.execute(duplicate.webhook)),
    );
    await assertOneCredit(duplicate.topUp.id, duplicate.wallet.id);
    console.log('PASS concurrent duplicate paid callbacks: one ledger credit');

    const race = await fixture();
    await completeAll([
      handler.reconcileRecord(race.topUp, true),
      handler.execute(race.webhook),
    ]);
    await handler.reconcileRecord(race.topUp, true); // Deliberately stale pending snapshot after PAID.
    await handler.execute({ ...race.webhook, success: false, code: '01' });
    await assertOneCredit(race.topUp.id, race.wallet.id);
    console.log('PASS cancel/payment race and stale failure: PAID dominates');

    const late = await fixture('EXPIRED');
    await completeAll([
      handler.execute(late.webhook),
      handler.execute(late.webhook),
    ]);
    await assertOneCredit(late.topUp.id, late.wallet.id);
    console.log('PASS expired late success: one ledger credit');
  } finally {
    try {
      // Delete only fixture IDs created by this invocation, never historical rows.
      const transactions = await prisma.walletTransaction.findMany({
        where: {
          referenceType: 'WALLET_TOP_UP',
          referenceId: { in: topUpIds },
        },
        select: { id: true },
      });
      await prisma.walletLedgerEntry.deleteMany({
        where: { walletId: { in: walletIds } },
      });
      await prisma.walletTransaction.deleteMany({
        where: { id: { in: transactions.map((row) => row.id) } },
      });
      await prisma.walletTopUp.deleteMany({ where: { id: { in: topUpIds } } });
      await prisma.wallet.deleteMany({ where: { id: { in: walletIds } } });
    } finally {
      await prisma.$disconnect();
    }
  }
}

void main().catch((error: unknown) => {
  console.error(
    error instanceof Error
      ? error.message
      : 'PayOS concurrency integration failed',
  );
  process.exitCode = 1;
});
