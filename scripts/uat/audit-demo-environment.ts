import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import {
  assertUatDemoPublicUrl,
  assertUatDemoRuntimeDatabaseTarget,
  requiredUatSecret,
} from './uat-safety';
import { loadUatEnv } from './load-uat-env';
import { DEMO_ACCOUNT_ALIASES } from './demo-fixture-contract';

const ALLOWLISTED_EMAIL_DOMAINS = new Set(['antifake.local', 'antifake.io.vn']);
const SYNTHETIC_MARKER = /(^|[^a-z])(uat|docs|demo|seed|test)([^a-z]|$)/i;

export type AuditUser = {
  email: string | null;
  displayName: string | null;
};

export type AuditShop = {
  shopName: string;
};

type AccountRecord = {
  role: string;
  accountStatus: string;
  emailVerifiedAt: Date | null;
  phoneVerifiedAt: Date | null;
} | null;

function accountSnapshot(user: AccountRecord) {
  return {
    exists: Boolean(user),
    role: user?.role ?? null,
    accountStatus: user?.accountStatus ?? null,
    emailVerified: Boolean(user?.emailVerifiedAt),
    phoneVerified: Boolean(user?.phoneVerifiedAt),
  };
}

export function classifySyntheticSignals(
  users: readonly AuditUser[],
  shops: readonly AuditShop[],
) {
  const domainCounts = new Map<string, number>();
  for (const user of users) {
    const domain = (user.email?.split('@').pop() || '(none)').toLowerCase();
    domainCounts.set(domain, (domainCounts.get(domain) ?? 0) + 1);
  }

  const externalEmailCount = [...domainCounts.entries()]
    .filter(([domain]) => !ALLOWLISTED_EMAIL_DOMAINS.has(domain))
    .reduce((total, [, count]) => total + count, 0);
  const unmarkedUserCount = users.filter(
    (user) => !SYNTHETIC_MARKER.test(user.displayName ?? ''),
  ).length;
  const unmarkedShopCount = shops.filter(
    (shop) => !SYNTHETIC_MARKER.test(shop.shopName),
  ).length;
  const reasons: string[] = [];

  if (externalEmailCount > 0) {
    reasons.push('external email-domain records');
  }
  if (unmarkedUserCount > 0) {
    reasons.push('users without synthetic markers');
  }
  if (unmarkedShopCount > 0) {
    reasons.push('shops without synthetic markers');
  }

  return {
    userCount: users.length,
    shopCount: shops.length,
    emailDomainGroupCount: domainCounts.size,
    externalEmailCount,
    unmarkedUserCount,
    unmarkedShopCount,
    safeForMutation: reasons.length === 0,
    reasons,
  };
}

async function main() {
  loadUatEnv();
  const databaseTarget = assertUatDemoRuntimeDatabaseTarget();
  const frontendUrl = assertUatDemoPublicUrl(
    requiredUatSecret('UAT_FRONTEND_PUBLIC_URL'),
  );
  const connectionString = requiredUatSecret('DATABASE_URL');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const [users, shops, buyer, seller, admin] = await Promise.all([
      prisma.user.findMany({
        select: { email: true, displayName: true },
      }),
      prisma.shop.findMany({
        select: { shopName: true },
      }),
      prisma.user.findUnique({
        where: { email: DEMO_ACCOUNT_ALIASES.buyer },
        select: {
          role: true,
          accountStatus: true,
          emailVerifiedAt: true,
          phoneVerifiedAt: true,
        },
      }),
      prisma.user.findUnique({
        where: { email: DEMO_ACCOUNT_ALIASES.seller },
        select: {
          role: true,
          accountStatus: true,
          emailVerifiedAt: true,
          phoneVerifiedAt: true,
        },
      }),
      prisma.user.findUnique({
        where: { email: DEMO_ACCOUNT_ALIASES.admin },
        select: {
          role: true,
          accountStatus: true,
          emailVerifiedAt: true,
          phoneVerifiedAt: true,
        },
      }),
    ]);

    const signals = classifySyntheticSignals(users, shops);
    const approvedAccounts = {
      buyer: accountSnapshot(buyer),
      seller: accountSnapshot(seller),
      admin: accountSnapshot(admin),
    };
    const tableCountQueries: ReadonlyArray<
      readonly [string, PromiseLike<number>]
    > = [
      ['users', prisma.user.count()],
      ['shops', prisma.shop.count()],
      ['offers', prisma.offer.count()],
      ['variants', prisma.offerVariant.count()],
      ['carts', prisma.cart.count()],
      ['vouchers', prisma.voucher.count()],
      ['orders', prisma.order.count()],
      ['verificationLabels', prisma.verificationLabel.count()],
      ['provenanceEvents', prisma.provenanceEvent.count()],
      ['chatThreads', prisma.chatThread.count()],
      ['socialPosts', prisma.socialPost.count()],
      ['affiliateAccounts', prisma.affiliateAccount.count()],
      ['affiliateConversions', prisma.affiliateConversion.count()],
      ['wallets', prisma.wallet.count()],
      ['moderationCases', prisma.moderationCase.count()],
    ];
    const tableCounts = await Promise.all(
      tableCountQueries.map(
        async ([name, query]) => [name, await query] as const,
      ),
    );
    const existingState: Record<string, number> = {};
    for (const [name, count] of tableCounts) {
      existingState[name] = count;
    }

    console.log(
      JSON.stringify(
        {
          environment: 'UAT_DEMO',
          runtime: frontendUrl,
          database: {
            name: databaseTarget.databaseName,
            target: databaseTarget.target,
            hostname: 'withheld',
            isolationMethod: databaseTarget.isolationMethod,
          },
          approvedAccounts,
          existingState,
          syntheticDataSignals: signals,
          mutationDecision: signals.safeForMutation
            ? 'OWNER_CONFIRMATION_REQUIRED'
            : 'HOLD_POSSIBLE_NON_SYNTHETIC_DATA',
          secrets: 'not inspected or emitted',
          writes: 'none',
        },
        null,
        2,
      ),
    );

    if (!signals.safeForMutation) process.exitCode = 2;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'UAT audit failed');
    process.exitCode = 1;
  });
}
