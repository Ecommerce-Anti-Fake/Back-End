import { PrismaClient } from '@prisma/client';
import { COUNTS, createMediaAsset, documentUrl, gtin, id, money, pick, recentDate, SeedContext } from './00-utils';
import { offerOptionSpecs } from './offer-option-specs';

const productImageQueries = [
  'milk,bottle',
  'mineral-water,bottle',
  'coffee,beans',
  'instant-noodles,food',
  'dish-soap,cleaning',
  'sunscreen,skincare',
  'body-wash,cosmetics',
  'stainless-steel,cooking-pot',
  'thermos,bottle',
  'running-shoes,sneakers',
  'cotton,t-shirt',
  'cashews,nuts',
  'artichoke,tea',
  'baby-formula,milk',
  'notebook,stationery',
] as const;

export function productImageUrl(templateIndex: number, offerIndex: number, mediaIndex: number) {
  const query = productImageQueries[templateIndex] ?? 'consumer,product';
  return `https://loremflickr.com/900/900/${query}?lock=${offerIndex * 2 + mediaIndex}`;
}

const productTemplates = [
  ['Sữa tươi tiệt trùng ít đường 1L', 'Thùng 12 hộp sữa tươi tiệt trùng 1L'],
  ['Nước khoáng thiên nhiên 500ml', 'Lốc nước khoáng 24 chai 500ml'],
  ['Cà phê rang xay nguyên chất 500g', 'Thùng cà phê rang xay 20 gói'],
  ['Mì gói vị bò 75g', 'Thùng mì gói 30 gói'],
  ['Nước rửa chén hương chanh 750ml', 'Combo nước rửa chén 24 chai'],
  ['Kem chống nắng SPF50 50ml', 'Lô kem chống nắng SPF50 48 tuýp'],
  ['Sữa tắm gạo non 500ml', 'Lô sữa tắm gạo non 36 chai'],
  ['Nồi inox 3 đáy 24cm', 'Lô nồi inox 3 đáy 12 cái'],
  ['Bình giữ nhiệt inox 500ml', 'Lô bình giữ nhiệt inox 50 cái'],
  ['Giày thể thao nam basic', 'Lô giày thể thao nam 30 đôi'],
  ['Áo thun cotton nữ', 'Lô áo thun cotton nữ 100 cái'],
  ['Hạt điều rang muối 500g', 'Thùng hạt điều rang muối 24 hộp'],
  ['Trà atiso Đà Lạt 20 túi', 'Lô trà atiso Đà Lạt 50 hộp'],
  ['Sữa bột trẻ em 900g', 'Lô sữa bột trẻ em 24 lon'],
  ['Sổ tay văn phòng A5', 'Lô sổ tay văn phòng A5 200 cuốn'],
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
        description: `Sản phẩm ${title.toLowerCase()} từ ${brand.name}, có hồ sơ nguồn gốc và thông tin lô để phục vụ xác thực AntiFake.`,
        currency: 'VND',
        itemCondition: 'new',
        offerStatus: i % 17 === 0 ? 'draft' : 'active',
        moderationStatus: 'approved',
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
          issuerName: i % 2 === 0 ? 'Trung tâm kiểm định chất lượng' : 'Nhà sản xuất',
          documentNumberHash: `doc-hash-${i}`,
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
