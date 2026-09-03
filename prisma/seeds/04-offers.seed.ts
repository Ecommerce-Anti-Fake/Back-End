import { PrismaClient } from '@prisma/client';
import {
  COUNTS,
  createMediaAsset,
  documentUrl,
  gtin,
  id,
  imageUrl,
  money,
  pick,
  recentDate,
  SeedContext,
} from './00-utils';
import { offerOptionSpecs } from './offer-option-specs';

const productTemplates = [
  ['San pham kiem thu UAT 01', 'Lo san pham kiem thu UAT 01'],
  ['San pham kiem thu UAT 02', 'Lo san pham kiem thu UAT 02'],
  ['San pham kiem thu UAT 03', 'Lo san pham kiem thu UAT 03'],
  ['San pham kiem thu UAT 04', 'Lo san pham kiem thu UAT 04'],
  ['San pham kiem thu UAT 05', 'Lo san pham kiem thu UAT 05'],
  ['San pham kiem thu UAT 06', 'Lo san pham kiem thu UAT 06'],
  ['San pham kiem thu UAT 07', 'Lo san pham kiem thu UAT 07'],
  ['San pham kiem thu UAT 08', 'Lo san pham kiem thu UAT 08'],
  ['San pham kiem thu UAT 09', 'Lo san pham kiem thu UAT 09'],
  ['San pham kiem thu UAT 10', 'Lo san pham kiem thu UAT 10'],
  ['San pham kiem thu UAT 11', 'Lo san pham kiem thu UAT 11'],
  ['San pham kiem thu UAT 12', 'Lo san pham kiem thu UAT 12'],
  ['San pham kiem thu UAT 13', 'Lo san pham kiem thu UAT 13'],
  ['San pham kiem thu UAT 14', 'Lo san pham kiem thu UAT 14'],
  ['San pham kiem thu UAT 15', 'Lo san pham kiem thu UAT 15'],
] as const;

export function productImageUrl(
  templateIndex: number,
  offerIndex: number,
  mediaIndex: number,
) {
  return imageUrl(
    `uat-product-${templateIndex + 1}-${offerIndex + 1}-${mediaIndex + 1}`,
    900,
    900,
  );
}

export async function seedOffers(prisma: PrismaClient, ctx: SeedContext) {
  for (let i = 0; i < COUNTS.offers; i += 1) {
    const brand = pick(ctx.brands, i);
    const category = pick(ctx.categories, i);
    const distributorPool = ctx.distributorShops.length
      ? ctx.distributorShops
      : ctx.shops;
    const manufacturerPool = ctx.manufacturerShops.length
      ? ctx.manufacturerShops
      : ctx.shops;
    const shop =
      i % 4 === 0 ? pick(distributorPool, i) : pick(manufacturerPool, i);
    const seller =
      ctx.users.find((user) => user.id === shop.ownerUserId) ??
      pick(ctx.users, i);
    const templateIndex = i % productTemplates.length;
    const template = productTemplates[templateIndex];
    const isWholesale = i % 4 === 1;
    const isRetailShoe = false;
    const title = isWholesale ? template[1] : template[0];
    const price = isWholesale ? 900000 + i * 35000 : 25000 + i * 7000;

    const offer = await prisma.offer.create({
      data: {
        id: id(),
        sellerUserId: seller.id,
        shopId: shop.id,
        categoryId: category.id,
        brandId: brand.id,
        modelName: title,
        gtin: gtin(i + 100),
        verificationPolicy: i % 5 === 0 ? 'MANUAL_REVIEW' : 'BATCH_REQUIRED',
        title: `${title} - ${brand.name}`,
        description: `San pham ${title.toLowerCase()} dung cho kiem thu giao dien, gio hang va xac thuc AntiFake.`,
        currency: 'VND',
        itemCondition: 'new',
        offerStatus: i === 0 ? 'draft' : 'active',
        moderationStatus: i === 1 ? 'pending' : 'approved',
        parcelWeightGrams: isRetailShoe ? 1000 : 300 + (i % 10) * 150,
        parcelLengthCm: isRetailShoe ? 35 : 10 + (i % 6) * 3,
        parcelWidthCm: isRetailShoe ? 25 : 8 + (i % 5) * 2,
        parcelHeightCm: isRetailShoe ? 15 : 6 + (i % 4) * 2,
        createdAt: recentDate(60 - (i % 50)),
      },
    });
    ctx.offers.push(offer);

    for (let j = 0; j < 2; j += 1) {
      const media = await createMediaAsset(prisma, {
        ownerUserId: seller.id,
        resourceType: 'PRODUCT_IMAGE',
        secureUrl: productImageUrl(templateIndex, i, j),
        publicId: `uat/offers/${i + 1}/${j + 1}`,
        folder: 'uat/offers',
      });
      await prisma.offerMedia.create({
        data: {
          id: id(),
          offerId: offer.id,
          mediaAssetId: media.id,
          mediaType: 'image',
          fileUrl: media.secureUrl,
          phash: `uat-phash-${i + 1}-${j + 1}`,
        },
      });
    }

    if (i < COUNTS.offerDocuments) {
      const media = await createMediaAsset(prisma, {
        ownerUserId: seller.id,
        resourceType: 'OFFER_DOCUMENT',
        secureUrl: documentUrl(`uat-offer-doc-${i + 1}`),
        publicId: `uat/offer-documents/${i + 1}`,
        mimeType: 'application/pdf',
        assetType: 'RAW',
      });
      await prisma.offerDocument.create({
        data: {
          id: id(),
          offerId: offer.id,
          mediaAssetId: media.id,
          docType: i % 2 === 0 ? 'CO_CQ' : 'PRODUCT_DECLARATION',
          fileUrl: media.secureUrl,
          issuerName: 'Don vi kiem thu UAT',
          documentNumberHash: `uat-doc-hash-${i + 1}`,
          reviewStatus: i % 7 === 0 ? 'pending' : 'approved',
          uploadedAt: recentDate(45 - (i % 30)),
        },
      });
    }

    const optionSpecs = offerOptionSpecs(templateIndex);
    const optionValues = await Promise.all(
      optionSpecs.map(async (spec) => {
        const group = await prisma.offerOptionGroup.create({
          data: { id: id(), offerId: offer.id, displayName: spec.displayName },
        });
        return Promise.all(
          spec.values.map((text, sortOrder) =>
            prisma.offerOptionValue.create({
              data: { id: id(), optionGroupId: group.id, text, sortOrder },
            }),
          ),
        );
      }),
    );
    for (let variantIndex = 0; variantIndex < 4; variantIndex += 1) {
      const firstValue = optionValues[0][variantIndex % 2];
      const secondValue = optionValues[1][Math.floor(variantIndex / 2)];
      const variant = await prisma.offerVariant.create({
        data: {
          id: id(),
          offerId: offer.id,
          sku: `${firstValue.text}-${secondValue.text}`,
          price: money(price + variantIndex * 5000),
          availableQuantity: 10 + variantIndex * 5,
          isActive: true,
        },
      });
      await prisma.offerVariantValue.createMany({
        data: [
          { id: id(), variantId: variant.id, optionValueId: firstValue.id },
          { id: id(), variantId: variant.id, optionValueId: secondValue.id },
        ],
      });
    }
  }
}
