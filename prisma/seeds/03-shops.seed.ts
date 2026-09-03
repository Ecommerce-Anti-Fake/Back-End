import { PrismaClient, ShopRegistrationType } from '@prisma/client';
import {
  COUNTS,
  avatarUrl,
  createMediaAsset,
  documentUrl,
  id,
  imageUrl,
  pick,
  recentDate,
  SeedContext,
  taxCode,
} from './00-utils';

function shopName(index: number) {
  return `Cua hang Demo UAT ${String(index + 1).padStart(2, '0')}`;
}

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
    const status = i === 0 ? 'pending_verification' : 'verified';
    let shop = await prisma.shop.create({
      data: {
        id: id(),
        ownerUserId: owner.id,
        shopTypeId: shopType?.id,
        shopName: shopName(i),
        registrationType,
        businessType:
          registrationType === ShopRegistrationType.NORMAL
            ? 'HOUSEHOLD'
            : 'COMPANY',
        taxCode: taxCode(i + 1),
        shopStatus: status,
        warehouseAddress: `Kho kiem thu UAT ${String(i + 1).padStart(2, '0')}`,
        warehouseProvinceCode: 'UAT-PROVINCE',
        warehouseProvinceName: 'Tinh kiem thu UAT',
        warehouseWardCode: `UAT-WARD-${String((i % 5) + 1).padStart(2, '0')}`,
        warehouseWardName: `Phuong kiem thu UAT ${String((i % 5) + 1).padStart(2, '0')}`,
        createdAt: recentDate(90 - i),
      },
    });
    const avatar = await createMediaAsset(prisma, {
      ownerUserId: owner.id,
      resourceType: 'SHOP_AVATAR',
      secureUrl: avatarUrl(`uat-shop-${i + 1}`),
      publicId: `uat/shops/${i + 1}/avatar`,
      folder: 'uat/shops/avatars',
    });
    const banner = await createMediaAsset(prisma, {
      ownerUserId: owner.id,
      resourceType: 'SHOP_BANNER',
      secureUrl: imageUrl(`uat-shop-banner-${i + 1}`, 1440, 480),
      publicId: `uat/shops/${i + 1}/banner`,
      folder: 'uat/shops/banners',
    });
    shop = await prisma.shop.update({
      where: { id: shop.id },
      data: {
        avatarMediaId: avatar.id,
        bannerMediaId: banner.id,
      },
    });
    ctx.shops.push(shop);
    if (registrationType === ShopRegistrationType.MANUFACTURER)
      ctx.manufacturerShops.push(shop);
    if (registrationType === ShopRegistrationType.DISTRIBUTOR)
      ctx.distributorShops.push(shop);
  }

  for (let i = 0; i < COUNTS.shopBusinessCategories; i += 1) {
    const shop = pick(ctx.shops, i);
    const category = pick(ctx.categories, i + Math.floor(i / 2));
    await prisma.shopBusinessCategory.upsert({
      where: {
        shopId_categoryId: { shopId: shop.id, categoryId: category.id },
      },
      update: {},
      create: {
        id: id(),
        shopId: shop.id,
        categoryId: category.id,
        registrationStatus: 'approved',
        approvedAt: recentDate(60 - (i % 30)),
        reviewNote: null,
        createdAt: recentDate(80 - (i % 40)),
      },
    });
  }

  for (let i = 0; i < COUNTS.shopDocuments; i += 1) {
    const shop = pick(ctx.shops, i);
    const requirementKeys = Object.keys(ctx.requirements);
    const requirement =
      ctx.requirements[requirementKeys[i % requirementKeys.length]];
    const isPending = i % 6 === 0;
    const doc = await prisma.shopDocument.create({
      data: {
        id: id(),
        shopId: shop.id,
        requirementId: requirement.id,
        docType: requirement.code,
        reviewStatus: isPending ? 'pending' : 'approved',
        reviewNote: isPending ? 'Dang cho Admin kiem tra tai lieu UAT.' : null,
        reviewedAt: isPending ? null : recentDate(30 - (i % 20)),
        uploadedAt: recentDate(70 - (i % 40)),
      },
    });

    const fileCount =
      i < COUNTS.shopDocumentFiles - COUNTS.shopDocuments ? 2 : 1;
    for (let j = 0; j < fileCount; j += 1) {
      const media = await createMediaAsset(prisma, {
        ownerUserId: shop.ownerUserId,
        resourceType: 'SHOP_DOCUMENT',
        secureUrl: documentUrl(`uat-shop-doc-${i + 1}-${j + 1}`),
        publicId: `uat/shop-documents/${i + 1}/${j + 1}`,
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

  for (let i = 0; i < COUNTS.brandAuthorizations; i += 1) {
    const shop = pick(ctx.shops, i);
    const brand = pick(ctx.brands, i);
    const media = await createMediaAsset(prisma, {
      ownerUserId: shop.ownerUserId,
      resourceType: 'SHOP_DOCUMENT',
      secureUrl: documentUrl(`uat-brand-auth-${i + 1}`),
      publicId: `uat/brand-authorizations/${i + 1}`,
      mimeType: 'application/pdf',
      assetType: 'RAW',
    });
    const isPending = i % 7 === 0;
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
        verificationStatus: isPending ? 'pending' : 'approved',
        reviewNote: isPending ? 'Dang cho xac nhan thuong hieu UAT.' : null,
        verifiedAt: isPending ? null : recentDate(35 - (i % 20)),
      },
    });
  }
}
