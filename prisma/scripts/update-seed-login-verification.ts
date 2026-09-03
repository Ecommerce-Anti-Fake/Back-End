import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { loadUatEnv } from '../../scripts/uat/load-uat-env';
import {
  assertUatDatabaseTarget,
  requiredUatSecret,
} from '../../scripts/uat/uat-safety';

loadUatEnv();
assertUatDatabaseTarget();
const connectionString = requiredUatSecret('DATABASE_URL');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const verifiedAt = new Date();
  const result = await prisma.user.updateMany({
    where: {
      OR: [
        { email: 'buyer-uat@antifake.local' },
        { email: 'seller-uat@antifake.local' },
        { email: 'admin-uat@antifake.local' },
      ],
    },
    data: { emailVerifiedAt: verifiedAt, phoneVerifiedAt: verifiedAt },
  });
  console.log(
    `Marked ${result.count} seeded accounts as email/phone verified for UAT login.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
