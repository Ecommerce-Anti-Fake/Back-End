import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const verifiedAt = new Date();
  const result = await prisma.user.updateMany({
    where: {
      OR: [
        { email: 'seed.user01@antifake.local' },
        { email: 'seed.user02@antifake.local' },
        { email: 'admin@antifake.io.vn' },
      ],
    },
    data: { emailVerifiedAt: verifiedAt, phoneVerifiedAt: verifiedAt },
  });
  console.log(`Marked ${result.count} seeded accounts as email/phone verified for UAT login.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
