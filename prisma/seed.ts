import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { clearSeedData, COUNTS, createSeedContext } from './seeds/00-utils';
import { seedMasterData } from './seeds/01-master-data.seed';
import { seedUsersAndKyc } from './seeds/02-users-kyc.seed';
import { seedShops } from './seeds/03-shops.seed';
import { seedOffers } from './seeds/04-offers.seed';
import { seedBatchesQr } from './seeds/05-batches-qr.seed';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
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
  });
  console.log('Demo password for all seeded users: 12345678');
  console.log('Admin account: seed.user03@antifake.local');
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
