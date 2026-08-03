import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { clearSeedData, COUNTS, createSeedContext } from './seeds/00-utils';
import { seedMasterData } from './seeds/01-master-data.seed';
import { seedUsersAndKyc } from './seeds/02-users-kyc.seed';
import { seedShops } from './seeds/03-shops.seed';
import { seedOffers } from './seeds/04-offers.seed';
import { seedBatchesQr } from './seeds/05-batches-qr.seed';
import { seedDistribution } from './seeds/06-distribution.seed';
import { seedOrders } from './seeds/07-orders.seed';
import { seedReviewsDisputes } from './seeds/08-reviews-disputes.seed';
import { seedAffiliate } from './seeds/09-affiliate.seed';
import { seedSocialChatLive } from './seeds/10-social-chat-live.seed';
import { seedNotificationsModeration } from './seeds/11-notifications-moderation.seed';
import { seedWalletsAndVouchers } from './seeds/12-wallets-vouchers.seed';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

if (/(neon\.tech|supabase\.co|render\.com|amazonaws\.com)/i.test(connectionString) && process.env.SEED_ALLOW_HOSTED_DB !== 'true') {
  throw new Error('Refusing destructive seed against a hosted database. Set SEED_ALLOW_HOSTED_DB=true only for an explicitly approved UAT database.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const ctx = createSeedContext();

  console.log('AntiFake UAT seed started.');
  console.log('Clearing existing seed/dev data...');
  await clearSeedData(prisma);

  console.log('Phase 1: master data, users, KYC, shops, catalog, offers...');
  await seedMasterData(prisma, ctx);
  await seedUsersAndKyc(prisma, ctx);
  await seedShops(prisma, ctx);
  await seedOffers(prisma, ctx);

  console.log('Phase 2: batches, QR labels, provenance...');
  await seedBatchesQr(prisma, ctx);

  console.log('Phase 3: distribution, carts, orders, reviews, disputes...');
  await seedDistribution(prisma, ctx);
  await seedOrders(prisma, ctx);
  await seedReviewsDisputes(prisma, ctx);

  console.log('Phase 4: affiliate, social, chat, live, notifications...');
  await seedAffiliate(prisma, ctx);
  await seedSocialChatLive(prisma, ctx);
  await seedNotificationsModeration(prisma, ctx);

  console.log('Phase 5: wallets, vouchers, settlement fixtures...');
  await seedWalletsAndVouchers(prisma, ctx);

  console.log('AntiFake UAT seed completed.');
  console.table({
    users: COUNTS.users,
    shops: COUNTS.shops,
    brands: COUNTS.brands,
    categories: COUNTS.categories,
    offers: COUNTS.offers,
    supplyBatches: COUNTS.supplyBatches,
    verificationLabels: COUNTS.verificationLabels,
    provenanceEvents: COUNTS.provenanceEvents,
    orders: COUNTS.orders,
    reviews: COUNTS.reviews,
    notifications: COUNTS.notifications,
    liveSessions: COUNTS.liveSessions,
    wallets: COUNTS.userWallets + COUNTS.shopWallets + 1,
    vouchers: COUNTS.vouchers,
  });
  console.log('Seed password for all seeded users: antifake@2026');
  console.log('Admin account: admin@antifake.io.vn');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
