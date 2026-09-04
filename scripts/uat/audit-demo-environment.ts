import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Client } from 'pg';
import {
  assertUatDemoDataClassificationConfirmed,
  assertUatDemoFixturePolicy,
  assertUatDemoPublicUrl,
  assertUatDemoRuntimeDatabaseTarget,
  requiredUatSecret,
} from './uat-safety';
import { loadUatEnv } from './load-uat-env';
import {
  DEMO_ACCOUNT_ALIASES,
  validateDemoFixtureSnapshot,
} from './demo-fixture-contract';
import { buildDemoFixtureSnapshot } from './verify-demo-fixtures';

const ALLOWLISTED_EMAIL_DOMAINS = new Set(['antifake.local', 'antifake.io.vn']);
const SYNTHETIC_MARKER = /(^|[^a-z])(uat|docs|demo|seed|test)([^a-z]|$)/i;

export type AuditUser = {
  email: string | null;
  displayName: string | null;
  createdAt?: Date;
};

export type AuditShop = {
  shopName: string;
  createdAt?: Date;
};

type AccountRecord = {
  role: string;
  accountStatus: string;
  emailVerifiedAt: Date | null;
  phoneVerifiedAt: Date | null;
} | null;

type DatabaseIdentityRow = {
  name: string;
};

type SchemaRow = {
  schema_name: string;
};

type TableCountRow = {
  schema_name: string;
  count: number;
};

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
  legacyDataCutoff?: Date,
) {
  const domainCounts = new Map<string, number>();
  for (const user of users) {
    const domain = (user.email?.split('@').pop() || '(none)').toLowerCase();
    domainCounts.set(domain, (domainCounts.get(domain) ?? 0) + 1);
  }

  const externalEmailCount = [...domainCounts.entries()]
    .filter(([domain]) => !ALLOWLISTED_EMAIL_DOMAINS.has(domain))
    .reduce((total, [, count]) => total + count, 0);
  const isLegacy = (createdAt: Date | undefined) =>
    Boolean(legacyDataCutoff && createdAt && createdAt <= legacyDataCutoff);
  const legacyUsers = users.filter((user) => isLegacy(user.createdAt));
  const legacyShops = shops.filter((shop) => isLegacy(shop.createdAt));
  const newUsers = users.filter((user) => !isLegacy(user.createdAt));
  const newShops = shops.filter((shop) => !isLegacy(shop.createdAt));
  const legacyExternalEmailCount = legacyUsers.filter((user) => {
    const domain = (user.email?.split('@').pop() || '(none)').toLowerCase();
    return !ALLOWLISTED_EMAIL_DOMAINS.has(domain);
  }).length;
  const newExternalEmailCount = newUsers.filter((user) => {
    const domain = (user.email?.split('@').pop() || '(none)').toLowerCase();
    return !ALLOWLISTED_EMAIL_DOMAINS.has(domain);
  }).length;
  const unmarkedUserCount = users.filter(
    (user) => !SYNTHETIC_MARKER.test(user.displayName ?? ''),
  ).length;
  const unmarkedShopCount = shops.filter(
    (shop) => !SYNTHETIC_MARKER.test(shop.shopName),
  ).length;
  const reasons: string[] = [];

  if (newExternalEmailCount > 0) {
    reasons.push(
      legacyDataCutoff
        ? 'new external email-domain records'
        : 'external email-domain records',
    );
  }
  const unclassifiedNewUserCount = newUsers.filter(
    (user) => !SYNTHETIC_MARKER.test(user.displayName ?? ''),
  ).length;
  const unclassifiedNewShopCount = newShops.filter(
    (shop) => !SYNTHETIC_MARKER.test(shop.shopName),
  ).length;
  if (unclassifiedNewUserCount > 0) {
    reasons.push(
      legacyDataCutoff
        ? 'new users without synthetic markers'
        : 'users without synthetic markers',
    );
  }
  if (unclassifiedNewShopCount > 0) {
    reasons.push(
      legacyDataCutoff
        ? 'new shops without synthetic markers'
        : 'shops without synthetic markers',
    );
  }

  return {
    userCount: users.length,
    shopCount: shops.length,
    emailDomainGroupCount: domainCounts.size,
    externalEmailCount,
    unmarkedUserCount,
    unmarkedShopCount,
    legacyUserCount: legacyUsers.length,
    legacyShopCount: legacyShops.length,
    legacyExternalEmailCount,
    legacyUnmarkedUserCount: legacyUsers.filter(
      (user) => !SYNTHETIC_MARKER.test(user.displayName ?? ''),
    ).length,
    legacyUnmarkedShopCount: legacyShops.filter(
      (shop) => !SYNTHETIC_MARKER.test(shop.shopName),
    ).length,
    unclassifiedNewUserCount,
    unclassifiedNewShopCount,
    newExternalEmailCount,
    legacyDataCutoff: legacyDataCutoff?.toISOString() ?? null,
    legacyDataPresent: legacyUsers.length > 0 || legacyShops.length > 0,
    unclassifiedNewData:
      newExternalEmailCount > 0 ||
      unclassifiedNewUserCount > 0 ||
      unclassifiedNewShopCount > 0,
    safeForMutation: reasons.length === 0,
    reasons,
  };
}

async function inspectDatabaseStructure(connectionString: string) {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query('BEGIN TRANSACTION READ ONLY');
    const identity = await client.query<DatabaseIdentityRow>(
      'select current_database() as name',
    );
    const schemas = await client.query<SchemaRow>(
      'select schema_name from information_schema.schemata order by schema_name',
    );
    const tableCounts = await client.query<TableCountRow>(
      'select table_schema as schema_name, count(1)::int as count from information_schema.tables group by table_schema order by table_schema',
    );
    await client.query('ROLLBACK');

    return {
      databaseName: identity.rows[0]?.name ?? 'unknown',
      applicationSchemas: schemas.rows
        .map((row) => row.schema_name)
        .filter(
          (name) =>
            name !== 'pg_catalog' &&
            name !== 'information_schema' &&
            name !== 'pg_toast' &&
            !name.startsWith('pg_temp_'),
        ),
      tableCountsBySchema: tableCounts.rows.map((row) => ({
        schema: row.schema_name,
        count: Number(row.count),
      })),
      readOnlyTransaction: true,
    };
  } finally {
    await client.end();
  }
}

async function main() {
  loadUatEnv();
  const databaseTarget = assertUatDemoRuntimeDatabaseTarget();
  const legacyDataCutoff = assertUatDemoDataClassificationConfirmed();
  const fixturePolicy = assertUatDemoFixturePolicy();
  const frontendUrl = assertUatDemoPublicUrl(
    requiredUatSecret('UAT_FRONTEND_PUBLIC_URL'),
  );
  const connectionString = requiredUatSecret('DATABASE_URL');
  const qrCode = process.env.UAT_QR_CODE?.trim().toUpperCase();
  const databaseStructure = await inspectDatabaseStructure(connectionString);
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const [users, shops, buyer, seller, admin] = await Promise.all([
      prisma.user.findMany({
        select: { email: true, displayName: true, createdAt: true },
      }),
      prisma.shop.findMany({
        select: { shopName: true, createdAt: true },
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

    const signals = classifySyntheticSignals(users, shops, legacyDataCutoff);
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

    const managedFixtures = qrCode
      ? (() => {
          return buildDemoFixtureSnapshot(prisma, qrCode).then((snapshot) => {
            const result = validateDemoFixtureSnapshot(snapshot);
            return {
              status: result.ok ? 'VALID' : 'MISSING_OR_INVALID',
              snapshot,
              missing: result.missing,
            } as const;
          });
        })()
      : Promise.resolve({
          status: 'NOT_CHECKED' as const,
          snapshot: null,
          missing: ['UAT_QR_CODE was not injected'],
        });
    const managedFixtureState = await managedFixtures;
    const productionProviderRisk =
      fixturePolicy.realPaymentAllowed ||
      fixturePolicy.realPayoutAllowed ||
      fixturePolicy.realShipmentAllowed ||
      fixturePolicy.realExternalKycAllowed ||
      fixturePolicy.realLivestreamAllowed
        ? 'REVIEW_REQUIRED'
        : 'DENIED_BY_FIXTURE_POLICY';

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
            structure: databaseStructure,
          },
          approvedAccounts,
          existingState,
          syntheticDataSignals: signals,
          classification: {
            legacyData: signals.legacyDataPresent
              ? 'LEGACY_DEMO_DATA_PRESENT'
              : 'NONE_DETECTED',
            managedFixtures:
              managedFixtureState.status === 'VALID'
                ? 'DOCS_UAT_FIXTURES_VALID'
                : managedFixtureState.status,
            unclassifiedNewData: signals.unclassifiedNewData,
            productionProviderRisk,
          },
          managedFixtures: managedFixtureState,
          mutationPolicy: fixturePolicy,
          mutationDecision: signals.unclassifiedNewData
            ? 'HOLD_UNCLASSIFIED_NEW_DATA'
            : 'ALLOW_DOCS_UAT_ADDITIVE_ONLY',
          secrets: 'not inspected or emitted',
          writes: 'none',
        },
        null,
        2,
      ),
    );

    if (
      signals.unclassifiedNewData ||
      productionProviderRisk === 'REVIEW_REQUIRED'
    ) {
      process.exitCode = 2;
    }
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
