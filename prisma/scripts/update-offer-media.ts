import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { loadUatEnv } from '../../scripts/uat/load-uat-env';
import {
  assertUatDatabaseTarget,
  requiredUatSecret,
} from '../../scripts/uat/uat-safety';
import { productImageUrl } from '../seeds/04-offers.seed';
import { offerTemplateIndexForText } from '../seeds/offer-option-specs';

loadUatEnv();
assertUatDatabaseTarget();
const connectionString = requiredUatSecret('DATABASE_URL');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const offers = await prisma.offer.findMany({
    select: { id: true, modelName: true, title: true },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });

  let updated = 0;
  for (const [offerIndex, offer] of offers.entries()) {
    const mediaItems = await prisma.offerMedia.findMany({
      where: { offerId: offer.id },
      select: { id: true, mediaAssetId: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    const templateIndex = offerTemplateIndexForText(
      offer.modelName,
      offer.title,
    );

    for (const [mediaIndex, media] of mediaItems.entries()) {
      const secureUrl = productImageUrl(templateIndex, offerIndex, mediaIndex);
      await prisma.offerMedia.update({
        where: { id: media.id },
        data: { fileUrl: secureUrl },
      });
      if (media.mediaAssetId) {
        await prisma.mediaAsset.update({
          where: { id: media.mediaAssetId },
          data: { secureUrl },
        });
      }
      updated += 1;
    }
  }

  console.log(
    `Updated ${updated} offer media records with category-matched image URLs.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
