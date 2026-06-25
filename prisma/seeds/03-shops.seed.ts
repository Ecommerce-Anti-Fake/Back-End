import { PrismaClient, ShopRegistrationType } from '@prisma/client';
import { COUNTS, avatarUrl, createMediaAsset, documentUrl, id, imageUrl, pick, recentDate, SeedContext, taxCode } from './00-utils';

const shopNames = [
  'Vinamilk Official Store',
  'TH True Milk Flagship',
  'Nutifood Chính Hãng',
  'Masan Consumer Store',
  'Acecook Việt Nam',
  'Cocoon Việt Nam',
  'Thorakao Official',
  'Lix Home Care',
  'Sunhouse Mall',
  'LocknLock Việt Nam',
  "Biti's Official",
  'Canifa Store',
  'Trung Nguyên Legend',
  'Lavie Official',
  'An Phước Fashion',
];

function registrationForIndex(index: number): ShopRegistrationType {
  if (index < 4) return ShopRegistrationType.MANUFACTURER;
  if (index < 10) return ShopRegistrationType.DISTRIBUTOR;
  if (index < 12) return ShopRegistrationType.HANDMADE;
  return ShopRegistrationType.NORMAL;
}

export async function seedShops(prisma: PrismaClient, ctx: SeedContext) {
  for (let i = 0; i < COUNTS.shops; i += 1) {
    const registrationType = registrationForIndex(i);
    const owner = pick(ctx.shopOwners.length ? ctx.shopOwners : ctx.users, i);
    const shopType = ctx.shopTypes[registrationType];
    const status = i % 9 === 0 ? 'pending_verification' : 'verified';
    let shop = await prisma.shop.create({
      data: {
        id: id(),
        ownerUserId: owner.id,
        shopTypeId: shopType?.id,
        shopName: shopNames[i],
        registrationType,
        businessType: registrationType === ShopRegistrationType.NORMAL ? 'HOUSEHOLD' : 'COMPANY',
        taxCode: taxCode(i + 1),
        shopStatus: status,
        createdAt: recentDate(90 - i),
      },
    });
    const avatar = await createMediaAsset(prisma, {
      ownerUserId: owner.id,
      resourceType: 'SHOP_AVATAR',
      secureUrl: avatarUrl(`shop-${shop.id}`),
      publicId: `seed/shops/${shop.id}/avatar`,
      folder: 'seed/shops/avatars',
    });
    const banner = await createMediaAsset(prisma, {
      ownerUserId: owner.id,
      resourceType: 'SHOP_BANNER',
      secureUrl: imageUrl(`shop-banner-${shop.id}`, 1440, 480),
      publicId: `seed/shops/${shop.id}/banner`,
      folder: 'seed/shops/banners',
    });
    shop = await prisma.shop.update({
      where: { id: shop.id },
      data: {
        avatarMediaId: avatar.id,
        bannerMediaId: banner.id,
      },
    });
    ctx.shops.push(shop);
    if (registrationType === ShopRegistrationType.MANUFACTURER) ctx.manufacturerShops.push(shop);
    if (registrationType === ShopRegistrationType.DISTRIBUTOR) ctx.distributorShops.push(shop);
  }

  for (let i = 0; i < COUNTS.shopBusinessCategories; i += 1) {
    const shop = pick(ctx.shops, i);
    const category = pick(ctx.categories, i + Math.floor(i / 2));
    await prisma.shopBusinessCategory.upsert({
      where: { shopId_categoryId: { shopId: shop.id, categoryId: category.id } },
      update: {},
      create: {
        id: id(),
        shopId: shop.id,
        categoryId: category.id,
        registrationStatus: i % 8 === 0 ? 'pending' : 'approved',
        approvedAt: i % 8 === 0 ? null : recentDate(60 - (i % 30)),
        reviewNote: i % 8 === 0 ? 'Đang chờ kiểm tra hồ sơ ngành hàng.' : null,
        createdAt: recentDate(80 - (i % 40)),
      },
    });
  }

  const shopCategories = await prisma.shopBusinessCategory.findMany();

  for (let i = 0; i < COUNTS.shopDocuments; i += 1) {
    const shop = pick(ctx.shops, i);
    const requirementKeys = Object.keys(ctx.requirements);
    const requirement = ctx.requirements[requirementKeys[i % requirementKeys.length]];
    const doc = await prisma.shopDocument.create({
      data: {
        id: id(),
        shopId: shop.id,
        requirementId: requirement.id,
        docType: requirement.code,
        reviewStatus: i % 6 === 0 ? 'pending' : 'approved',
        reviewNote: i % 6 === 0 ? 'Cần kiểm tra lại ngày hiệu lực.' : null,
        reviewedAt: i % 6 === 0 ? null : recentDate(30 - (i % 20)),
        uploadedAt: recentDate(70 - (i % 40)),
      },
    });

    const fileCount = i < COUNTS.shopDocumentFiles - COUNTS.shopDocuments ? 2 : 1;
    for (let j = 0; j < fileCount; j += 1) {
      const media = await createMediaAsset(prisma, {
        ownerUserId: shop.ownerUserId,
        resourceType: 'SHOP_DOCUMENT',
        secureUrl: documentUrl(`shop-doc-${shop.id}-${i}-${j}`),
        publicId: `seed/shop-documents/${shop.id}/${i}-${j}`,
        mimeType: 'application/pdf',
        assetType: 'RAW',
      });
      await prisma.shopDocumentFile.create({
        data: {
          id: id(),
          shopDocumentId: doc.id,
          mediaAssetId: media.id,
          fileUrl: media.secureUrl,
          sortOrder: j,
        },
      });
    }
  }

  for (let i = 0; i < COUNTS.shopCategoryDocuments; i += 1) {
    const shopCategory = pick(shopCategories, i);
    const media = await createMediaAsset(prisma, {
      ownerUserId: pick(ctx.shops, i).ownerUserId,
      resourceType: 'SHOP_DOCUMENT',
      secureUrl: documentUrl(`shop-category-${shopCategory.id}-${i}`),
      publicId: `seed/shop-category-documents/${shopCategory.id}`,
      mimeType: 'application/pdf',
      assetType: 'RAW',
    });
    await prisma.shopCategoryDocument.create({
      data: {
        id: id(),
        shopBusinessCategoryId: shopCategory.id,
        mediaAssetId: media.id,
        documentType: i % 3 === 0 ? 'FOOD_SAFETY_CERTIFICATE' : 'CATEGORY_REGISTRATION',
        fileUrl: media.secureUrl,
        documentNumber: `CAT-DOC-${String(i + 1).padStart(4, '0')}`,
        issuedBy: 'Sở Công Thương TP.HCM',
        issuedAt: recentDate(180 - i),
        expiresAt: recentDate(-365 - i),
        reviewStatus: i % 6 === 0 ? 'pending' : 'approved',
        reviewedAt: i % 6 === 0 ? null : recentDate(20 - (i % 10)),
      },
    });
  }

  for (let i = 0; i < COUNTS.brandAuthorizations; i += 1) {
    const shop = pick(ctx.shops, i);
    const brand = pick(ctx.brands, i);
    const media = await createMediaAsset(prisma, {
      ownerUserId: shop.ownerUserId,
      resourceType: 'SHOP_DOCUMENT',
      secureUrl: documentUrl(`brand-auth-${shop.id}-${brand.id}`),
      publicId: `seed/brand-authorizations/${shop.id}/${brand.id}`,
      mimeType: 'application/pdf',
      assetType: 'RAW',
    });
    await prisma.brandAuthorization.upsert({
      where: { shopId_brandId: { shopId: shop.id, brandId: brand.id } },
      update: {},
      create: {
        id: id(),
        shopId: shop.id,
        brandId: brand.id,
        mediaAssetId: media.id,
        authorizationType: i % 2 === 0 ? 'OWNER' : 'AUTHORIZED_DISTRIBUTOR',
        fileUrl: media.secureUrl,
        verificationStatus: i % 7 === 0 ? 'pending' : 'approved',
        reviewNote: i % 7 === 0 ? 'Đang chờ xác nhận từ thương hiệu.' : null,
        verifiedAt: i % 7 === 0 ? null : recentDate(35 - (i % 20)),
      },
    });
  }
}
