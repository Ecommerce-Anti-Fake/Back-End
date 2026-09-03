import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import { assertUatDatabaseTarget, requiredUatSecret } from './uat-safety';
import { loadUatEnv } from './load-uat-env';
import {
  validateUatFixtureSnapshot,
  type UatFixtureSnapshot,
} from './uat-fixture-contract';

loadUatEnv();

const databaseTarget = assertUatDatabaseTarget();
const connectionString = requiredUatSecret('DATABASE_URL');
const qrCode = requiredUatSecret('UAT_QR_CODE').trim().toUpperCase();

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

async function buildSnapshot(
  prisma: PrismaClient,
): Promise<UatFixtureSnapshot> {
  const syntheticUserFilter = { email: { endsWith: '@antifake.local' } };
  const syntheticShopFilter = { shopName: { startsWith: 'Cua hang Demo UAT' } };
  const syntheticOfferFilter = { title: { contains: 'UAT' } };
  const syntheticAffiliateCodeFilter = { code: { startsWith: 'UAT-AFF-' } };

  const [buyer, seller, affiliate, admin, counts, orderStatuses, positiveQr] =
    await Promise.all([
      prisma.user.findUnique({
        where: { email: 'buyer-uat@antifake.local' },
        select: { role: true, accountStatus: true },
      }),
      prisma.user.findUnique({
        where: { email: 'seller-uat@antifake.local' },
        select: { role: true, accountStatus: true },
      }),
      prisma.user.findUnique({
        where: { email: 'affiliate-uat@antifake.local' },
        select: { role: true, accountStatus: true },
      }),
      prisma.user.findUnique({
        where: { email: 'admin-uat@antifake.local' },
        select: { role: true, accountStatus: true },
      }),
      Promise.all([
        prisma.user.count({ where: syntheticUserFilter }),
        prisma.shop.count({ where: syntheticShopFilter }),
        prisma.shop.count({
          where: { ...syntheticShopFilter, shopStatus: 'verified' },
        }),
        prisma.offer.count({ where: syntheticOfferFilter }),
        prisma.offer.count({
          where: {
            ...syntheticOfferFilter,
            offerStatus: 'active',
            moderationStatus: 'approved',
          },
        }),
        prisma.offerVariant.count({ where: { offer: syntheticOfferFilter } }),
        prisma.cart.count({
          where: { cartStatus: 'ACTIVE', buyer: syntheticUserFilter },
        }),
        prisma.order.count({ where: { buyer: syntheticUserFilter } }),
        prisma.voucher.count({
          where: { code: { startsWith: 'UAT' }, status: 'ACTIVE' },
        }),
        prisma.chatThread.count({ where: { buyer: syntheticUserFilter } }),
        prisma.chatMessage.count({
          where: { thread: { buyer: syntheticUserFilter } },
        }),
        prisma.socialPost.count({
          where: { visibility: 'PUBLIC', offer: syntheticOfferFilter },
        }),
        prisma.affiliateProgram.count({
          where: { slug: { startsWith: 'uat-affiliate-' } },
        }),
        prisma.affiliateAccount.count({ where: { user: syntheticUserFilter } }),
        prisma.affiliateConversion.count({
          where: { affiliateCode: syntheticAffiliateCodeFilter },
        }),
        prisma.affiliateCommissionLedger.count({
          where: {
            conversion: { affiliateCode: syntheticAffiliateCodeFilter },
          },
        }),
        prisma.wallet.count({
          where: { walletCode: { startsWith: 'UAT-WALLET-' } },
        }),
        prisma.userKyc.count({
          where: { verificationStatus: 'pending', user: syntheticUserFilter },
        }),
        prisma.shop.count({
          where: { ...syntheticShopFilter, shopStatus: 'pending_verification' },
        }),
        prisma.offer.count({
          where: { ...syntheticOfferFilter, moderationStatus: 'pending' },
        }),
      ]),
      Promise.all(
        ['completed', 'paid', 'shipping', 'pending', 'cancelled'].map(
          async (status) =>
            [
              status,
              await prisma.order.count({
                where: { buyer: syntheticUserFilter, orderStatus: status },
              }),
            ] as const,
        ),
      ).then((entries) => Object.fromEntries(entries)),
      prisma.verificationLabel
        .findFirst({
          where: {
            codeHash: sha256(qrCode),
            labelStatus: 'active',
            scopeType: 'SUPPLY_BATCH',
            provenance: { some: { eventType: 'VERIFIED' } },
          },
          select: { scopeId: true },
        })
        .then(async (label) => {
          if (!label) return false;
          const link = await prisma.offerBatchLink.findFirst({
            where: {
              batchId: label.scopeId,
              offer: {
                ...syntheticOfferFilter,
                offerStatus: 'active',
                moderationStatus: 'approved',
              },
            },
            select: { id: true },
          });
          return Boolean(link);
        }),
    ]);

  const [
    users,
    shops,
    verifiedShops,
    offers,
    activeOffers,
    variants,
    activeCarts,
    orders,
    activeVouchers,
    chatThreads,
    chatMessages,
    publicPosts,
    affiliatePrograms,
    affiliateAccounts,
    affiliateConversions,
    affiliateLedgerEntries,
    wallets,
    pendingKycs,
    pendingShopVerification,
    pendingOffers,
  ] = counts;

  return {
    aliases: {
      buyer: buyer?.role === 'user' && buyer.accountStatus === 'active',
      seller: seller?.role === 'user' && seller.accountStatus === 'active',
      affiliate:
        affiliate?.role === 'user' && affiliate.accountStatus === 'active',
      admin: admin?.role === 'admin' && admin.accountStatus === 'active',
    },
    counts: {
      users,
      shops,
      verifiedShops,
      offers,
      activeOffers,
      variants,
      activeCarts,
      orders,
      activeVouchers,
      chatThreads,
      chatMessages,
      publicPosts,
      affiliatePrograms,
      affiliateAccounts,
      affiliateConversions,
      affiliateLedgerEntries,
      wallets,
      pendingKycs,
      pendingShopVerification,
      pendingOffers,
    },
    positiveQr,
    orderStatuses,
  };
}

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  try {
    const snapshot = await buildSnapshot(prisma);
    const result = validateUatFixtureSnapshot(snapshot);
    console.log(
      JSON.stringify(
        {
          status: result.ok ? 'PASS' : 'FAIL',
          databaseTarget,
          snapshot,
          missing: result.missing,
        },
        null,
        2,
      ),
    );
    if (!result.ok) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : 'UAT fixture verification failed',
  );
  process.exitCode = 1;
});
