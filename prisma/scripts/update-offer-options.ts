import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { offerOptionSpecs, offerTemplateIndexForText } from '../seeds/offer-option-specs';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const offers = await prisma.offer.findMany({
    select: { id: true, modelName: true, title: true },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });

  let updated = 0;
  for (const offer of offers) {
    const groups = await prisma.offerOptionGroup.findMany({
      where: { offerId: offer.id },
      include: { values: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] } },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    if (groups.length !== 2 || groups.some((group) => group.values.length !== 2)) {
      throw new Error(`Unexpected option shape for offer ${offer.id}`);
    }

    const specs = offerOptionSpecs(offerTemplateIndexForText(offer.modelName, offer.title));
    await prisma.$transaction(
      [
        ...groups.map((group) =>
          prisma.offerOptionGroup.update({
            where: { id: group.id },
            data: { displayName: `__updating__${group.id}` },
          }),
        ),
        ...groups.flatMap((group) =>
          group.values.map((value) =>
            prisma.offerOptionValue.update({
              where: { id: value.id },
              data: { text: `__updating__${value.id}` },
            }),
          ),
        ),
        ...groups.flatMap((group, groupIndex) => [
          prisma.offerOptionGroup.update({
            where: { id: group.id },
            data: { displayName: specs[groupIndex].displayName },
          }),
        ...group.values.map((value, valueIndex) =>
          prisma.offerOptionValue.update({
            where: { id: value.id },
            data: { text: specs[groupIndex].values[valueIndex], sortOrder: valueIndex },
          }),
        ),
        ]),
      ],
    );
    updated += 1;
  }

  console.log(`Updated options for ${updated} offers.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
