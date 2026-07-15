import { PrismaClient } from '@prisma/client';
import { COUNTS, createMediaAsset, documentUrl, gtin, id, imageUrl, money, pick, recentDate, SeedContext } from './00-utils';

const productTemplates = [
  ['Sá»¯a tÆ°Æ¡i tiá»‡t trÃ¹ng Ã­t Ä‘Æ°á»ng 1L', 'ThÃ¹ng 12 há»™p sá»¯a tÆ°Æ¡i tiá»‡t trÃ¹ng 1L'],
  ['NÆ°á»›c khoÃ¡ng thiÃªn nhiÃªn 500ml', 'Lá»‘c nÆ°á»›c khoÃ¡ng 24 chai 500ml'],
  ['CÃ  phÃª rang xay nguyÃªn cháº¥t 500g', 'ThÃ¹ng cÃ  phÃª rang xay 20 gÃ³i'],
  ['MÃ¬ gÃ³i vá»‹ bÃ² 75g', 'ThÃ¹ng mÃ¬ gÃ³i 30 gÃ³i'],
  ['NÆ°á»›c rá»­a chÃ©n hÆ°Æ¡ng chanh 750ml', 'Combo nÆ°á»›c rá»­a chÃ©n 24 chai'],
  ['Kem chá»‘ng náº¯ng SPF50 50ml', 'LÃ´ kem chá»‘ng náº¯ng SPF50 48 tuÃ½p'],
  ['Sá»¯a táº¯m gáº¡o non 500ml', 'LÃ´ sá»¯a táº¯m gáº¡o non 36 chai'],
  ['Ná»“i inox 3 Ä‘Ã¡y 24cm', 'LÃ´ ná»“i inox 3 Ä‘Ã¡y 12 cÃ¡i'],
  ['BÃ¬nh giá»¯ nhiá»‡t inox 500ml', 'LÃ´ bÃ¬nh giá»¯ nhiá»‡t inox 50 cÃ¡i'],
  ['GiÃ y thá»ƒ thao nam basic', 'LÃ´ giÃ y thá»ƒ thao nam 30 Ä‘Ã´i'],
  ['Ão thun cotton ná»¯', 'LÃ´ Ã¡o thun cotton ná»¯ 100 cÃ¡i'],
  ['Háº¡t Ä‘iá»u rang muá»‘i 500g', 'ThÃ¹ng háº¡t Ä‘iá»u rang muá»‘i 24 há»™p'],
  ['TrÃ  atiso ÄÃ  Láº¡t 20 tÃºi', 'LÃ´ trÃ  atiso ÄÃ  Láº¡t 50 há»™p'],
  ['Sá»¯a bá»™t tráº» em 900g', 'LÃ´ sá»¯a bá»™t tráº» em 24 lon'],
  ['Sá»• tay vÄƒn phÃ²ng A5', 'LÃ´ sá»• tay vÄƒn phÃ²ng A5 200 cuá»‘n'],
] as const;

export async function seedOffers(prisma: PrismaClient, ctx: SeedContext) {
  for (let i = 0; i < COUNTS.offers; i += 1) {
    const brand = pick(ctx.brands, i);
    const category = pick(ctx.categories, i);
    const distributorPool = ctx.distributorShops.length ? ctx.distributorShops : ctx.shops;
    const manufacturerPool = ctx.manufacturerShops.length ? ctx.manufacturerShops : ctx.shops;
    const shop = i % 4 === 0 ? pick(distributorPool, i) : pick(manufacturerPool, i);
    const seller = ctx.users.find((user) => user.id === shop.ownerUserId) ?? pick(ctx.users, i);
    const templateIndex = i % productTemplates.length;
    const template = productTemplates[templateIndex];
    const isWholesale = i % 4 === 1;
    const isRetailShoe = templateIndex === 9 && !isWholesale;
    const title = isWholesale ? template[1] : template[0];
    const price = isRetailShoe ? 2990000 : isWholesale ? 900000 + i * 35000 : 25000 + i * 7000;

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
        description: `Sáº£n pháº©m ${title.toLowerCase()} tá»« ${brand.name}, cÃ³ há»“ sÆ¡ nguá»“n gá»‘c vÃ  thÃ´ng tin lÃ´ Ä‘á»ƒ phá»¥c vá»¥ xÃ¡c thá»±c AntiFake.`,
        currency: 'VND',
        itemCondition: 'new',
        offerStatus: i % 17 === 0 ? 'draft' : 'active',
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
        secureUrl: imageUrl(`offer-${offer.id}-${j}`, 900, 900),
        publicId: `seed/offers/${offer.id}/${j}`,
        folder: 'seed/offers',
      });
      await prisma.offerMedia.create({
        data: {
          id: id(),
          offerId: offer.id,
          mediaAssetId: media.id,
          mediaType: 'image',
          fileUrl: media.secureUrl,
          phash: `seed-phash-${i}-${j}`,
        },
      });
    }

    if (i < COUNTS.offerDocuments) {
      const media = await createMediaAsset(prisma, {
        ownerUserId: seller.id,
        resourceType: 'OFFER_DOCUMENT',
        secureUrl: documentUrl(`offer-doc-${offer.id}`),
        publicId: `seed/offer-documents/${offer.id}`,
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
          issuerName: i % 2 === 0 ? 'Trung tÃ¢m kiá»ƒm Ä‘á»‹nh cháº¥t lÆ°á»£ng' : 'NhÃ  sáº£n xuáº¥t',
          documentNumberHash: `doc-hash-${i}`,
          reviewStatus: i % 7 === 0 ? 'pending' : 'approved',
          uploadedAt: recentDate(45 - (i % 30)),
        },
      });
    }

    const colorGroup = await prisma.offerOptionGroup.create({
      data: { id: id(), offerId: offer.id, displayName: 'Màu sắc' },
    });
    const sizeGroup = await prisma.offerOptionGroup.create({
      data: { id: id(), offerId: offer.id, displayName: 'Kích thước' },
    });
    const colors = await Promise.all(
      ['Đỏ', 'Xanh'].map((text, sortOrder) =>
        prisma.offerOptionValue.create({
          data: { id: id(), optionGroupId: colorGroup.id, text, sortOrder },
        }),
      ),
    );
    const sizes = await Promise.all(
      ['S', 'M'].map((text, sortOrder) =>
        prisma.offerOptionValue.create({
          data: { id: id(), optionGroupId: sizeGroup.id, text, sortOrder },
        }),
      ),
    );
    for (let variantIndex = 0; variantIndex < 4; variantIndex += 1) {
      const variant = await prisma.offerVariant.create({
        data: {
          id: id(),
          offerId: offer.id,
          sku: `SEED-${String(i + 1).padStart(2, '0')}-${variantIndex + 1}`,
          price: money(price + variantIndex * 5000),
          availableQuantity: 10 + variantIndex * 5,
          isActive: true,
        },
      });
      await prisma.offerVariantValue.createMany({
        data: [
          { id: id(), variantId: variant.id, optionValueId: colors[variantIndex % 2].id },
          { id: id(), variantId: variant.id, optionValueId: sizes[Math.floor(variantIndex / 2)].id },
        ],
      });
    }
  }
}
