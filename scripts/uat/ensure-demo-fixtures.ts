import { PrismaPg } from '@prisma/adapter-pg';
import {
  AffiliateAccountStatus,
  AffiliateCommissionStatus,
  AffiliateConversionStatus,
  AffiliateProgramStatus,
  AffiliateScopeType,
  AffiliateSettlementMode,
  CommissionBeneficiaryType,
  KycDocumentSide,
  MediaAssetType,
  MediaProvider,
  MediaResourceType,
  Prisma,
  PrismaClient,
  ShopRegistrationType,
  SocialPostType,
  SocialPostVisibility,
  SocialReactionType,
  VoucherDiscountType,
  VoucherFundingSource,
  VoucherOwnerType,
  VoucherStatus,
  WalletOwnerType,
  WalletStatus,
  WalletTransactionStatus,
  WalletTransactionType,
} from '@prisma/client';
import { createHash } from 'node:crypto';
import {
  assertUatDemoDatabaseTarget,
  assertUatDemoDataClassificationConfirmed,
  assertUatDemoFixturePolicy,
  assertUatDemoPublicUrl,
  requiredUatSecret,
} from './uat-safety';
import { loadUatEnv } from './load-uat-env';
import {
  DEMO_ACCOUNT_ALIASES,
  DEMO_FIXTURE_IDS,
  DEMO_FIXTURE_NAMES,
  assertSyntheticFixtureValue,
} from './demo-fixture-contract';

type ReferenceData = {
  category: { id: string };
  brand: { id: string; name: string };
  shopType: { id: string };
  requirement: { id: string; code: string };
};

type FixtureAccounts = {
  buyer: { id: string; role: string; accountStatus: string };
  seller: { id: string; role: string; accountStatus: string };
  admin: { id: string; role: string; accountStatus: string };
};

type OrderFixture = {
  id: string;
  groupId: string;
  itemId: string;
  paymentIntentId: string;
  escrowId: string;
  key: 'pending' | 'confirmed' | 'shipping' | 'completed';
  orderStatus: string;
  fulfillmentStatus: string;
  paymentStatus: string;
  trackingCode: string | null;
  createdDaysAgo: number;
};

const QR_HASH_ALGORITHM = 'sha256';
const UAT_FIXED_PHONE = '0900000099';
const UAT_SHIPPING_PHONE = '0900000098';
const UAT_IMAGE_URL = 'https://picsum.photos/seed/docs-uat-antifake/900/900';
const UAT_BANNER_URL =
  'https://picsum.photos/seed/docs-uat-antifake-banner/1440/480';
const UAT_DOCUMENT_URL =
  'https://cdn.antifake.local/docs-uat/placeholder-document.pdf';

const ORDER_FIXTURES: readonly OrderFixture[] = [
  {
    id: DEMO_FIXTURE_IDS.orders.pending,
    groupId: DEMO_FIXTURE_IDS.orderGroups.pending,
    itemId: DEMO_FIXTURE_IDS.orderItems.pending,
    paymentIntentId: DEMO_FIXTURE_IDS.paymentIntents.pending,
    escrowId: DEMO_FIXTURE_IDS.escrows.pending,
    key: 'pending',
    orderStatus: 'pending',
    fulfillmentStatus: 'PENDING',
    paymentStatus: 'PENDING',
    trackingCode: null,
    createdDaysAgo: 2,
  },
  {
    id: DEMO_FIXTURE_IDS.orders.confirmed,
    groupId: DEMO_FIXTURE_IDS.orderGroups.confirmed,
    itemId: DEMO_FIXTURE_IDS.orderItems.confirmed,
    paymentIntentId: DEMO_FIXTURE_IDS.paymentIntents.confirmed,
    escrowId: DEMO_FIXTURE_IDS.escrows.confirmed,
    key: 'confirmed',
    orderStatus: 'paid',
    fulfillmentStatus: 'PROCESSING',
    paymentStatus: 'PAID',
    trackingCode: null,
    createdDaysAgo: 6,
  },
  {
    id: DEMO_FIXTURE_IDS.orders.shipping,
    groupId: DEMO_FIXTURE_IDS.orderGroups.shipping,
    itemId: DEMO_FIXTURE_IDS.orderItems.shipping,
    paymentIntentId: DEMO_FIXTURE_IDS.paymentIntents.shipping,
    escrowId: DEMO_FIXTURE_IDS.escrows.shipping,
    key: 'shipping',
    orderStatus: 'shipping',
    fulfillmentStatus: 'SHIPPING',
    paymentStatus: 'PAID',
    trackingCode: 'DOCS-UAT-TRACK-01',
    createdDaysAgo: 12,
  },
  {
    id: DEMO_FIXTURE_IDS.orders.completed,
    groupId: DEMO_FIXTURE_IDS.orderGroups.completed,
    itemId: DEMO_FIXTURE_IDS.orderItems.completed,
    paymentIntentId: DEMO_FIXTURE_IDS.paymentIntents.completed,
    escrowId: DEMO_FIXTURE_IDS.escrows.completed,
    key: 'completed',
    orderStatus: 'completed',
    fulfillmentStatus: 'DELIVERED',
    paymentStatus: 'PAID',
    trackingCode: 'DOCS-UAT-TRACK-02',
    createdDaysAgo: 20,
  },
];

function money(value: number) {
  return new Prisma.Decimal(value.toFixed(2));
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function sha256(value: string) {
  return createHash(QR_HASH_ALGORITHM).update(value).digest('hex');
}

function demoUrl(path: string) {
  const baseUrl = assertUatDemoPublicUrl(
    requiredUatSecret('UAT_FRONTEND_PUBLIC_URL'),
  );
  return new URL(path, baseUrl).toString();
}

async function ensureMedia(
  prisma: PrismaClient,
  input: {
    id: string;
    ownerUserId: string;
    resourceType: MediaResourceType;
    secureUrl: string;
    publicId: string;
    mimeType?: string;
    assetType?: MediaAssetType;
  },
) {
  const existing = await prisma.mediaAsset.findUnique({
    where: { id: input.id },
    select: { ownerUserId: true, publicId: true },
  });
  if (
    existing &&
    (existing.ownerUserId !== input.ownerUserId ||
      !existing.publicId?.toLowerCase().startsWith('docs-uat/'))
  ) {
    throw new Error('Reserved DOCS_UAT media ID is already occupied');
  }

  return prisma.mediaAsset.upsert({
    where: { id: input.id },
    update: {
      ownerUserId: input.ownerUserId,
      provider: MediaProvider.CLOUDINARY,
      assetType: input.assetType ?? MediaAssetType.IMAGE,
      resourceType: input.resourceType,
      publicId: input.publicId,
      secureUrl: input.secureUrl,
      mimeType: input.mimeType ?? 'image/jpeg',
      folder: 'docs-uat',
    },
    create: {
      id: input.id,
      ownerUserId: input.ownerUserId,
      provider: MediaProvider.CLOUDINARY,
      assetType: input.assetType ?? MediaAssetType.IMAGE,
      resourceType: input.resourceType,
      publicId: input.publicId,
      secureUrl: input.secureUrl,
      mimeType: input.mimeType ?? 'image/jpeg',
      folder: 'docs-uat',
    },
  });
}

async function approvedAccount(
  prisma: PrismaClient,
  email: string,
  label: string,
  requiredRole?: string,
) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, accountStatus: true },
  });
  if (!user) throw new Error(`Approved ${label} account is missing`);
  if (user.accountStatus !== 'active') {
    throw new Error(`Approved ${label} account is not active`);
  }
  if (requiredRole && user.role !== requiredRole) {
    throw new Error(
      `Approved ${label} account does not have the required role`,
    );
  }
  return user;
}

async function loadReferenceData(prisma: PrismaClient): Promise<ReferenceData> {
  const [category, brand, shopType, requirement] = await Promise.all([
    prisma.category.findFirst({
      select: { id: true },
    }),
    prisma.brand.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.shopType.findUnique({
      where: { code: 'NORMAL' },
      select: { id: true },
    }),
    prisma.verificationRequirement.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true, code: true },
    }),
  ]);

  if (!category || !brand || !shopType || !requirement) {
    throw new Error(
      'Required existing reference data is missing; no fixture writes were attempted',
    );
  }
  return { category, brand, shopType, requirement };
}

async function ensureReviewUser(prisma: PrismaClient) {
  const id = DEMO_FIXTURE_IDS.reviewUser;
  const email = DEMO_FIXTURE_NAMES.reviewUserEmail;
  const byId = await prisma.user.findUnique({ where: { id } });
  if (byId && byId.email !== email) {
    throw new Error('Reserved DOCS_UAT review user ID is already occupied');
  }
  const byEmail = await prisma.user.findUnique({ where: { email } });
  if (byEmail && byEmail.id !== id) {
    throw new Error('Reserved DOCS_UAT review email is already occupied');
  }

  const user = await prisma.user.upsert({
    where: { id },
    update: {
      email,
      phone: null,
      displayName: 'Nguoi dung Demo UAT Review',
      password: null,
      role: 'user',
      accountStatus: 'active',
      emailVerifiedAt: null,
      phoneVerifiedAt: null,
    },
    create: {
      id,
      email,
      phone: null,
      displayName: 'Nguoi dung Demo UAT Review',
      password: null,
      role: 'user',
      accountStatus: 'active',
    },
  });

  const avatar = await ensureMedia(prisma, {
    id: DEMO_FIXTURE_IDS.communityAuthorMedia,
    ownerUserId: user.id,
    resourceType: MediaResourceType.USER_AVATAR,
    secureUrl: UAT_IMAGE_URL,
    publicId: 'docs-uat/community/author-avatar',
  });

  return prisma.user.update({
    where: { id: user.id },
    data: { avatarMediaId: avatar.id },
  });
}

async function ensureApprovedShop(
  prisma: PrismaClient,
  seller: FixtureAccounts['seller'],
  shopTypeId: string,
  categoryId: string,
) {
  const shopName = assertSyntheticFixtureValue(
    DEMO_FIXTURE_NAMES.shop,
    'shop name',
  );
  let shop = await prisma.shop.findUnique({
    where: { id: DEMO_FIXTURE_IDS.shop },
  });
  if (shop && (shop.ownerUserId !== seller.id || shop.shopName !== shopName)) {
    throw new Error('Reserved DOCS_UAT shop ID is already occupied');
  }
  if (!shop) {
    const existing = await prisma.shop.findFirst({ where: { shopName } });
    if (existing && existing.ownerUserId !== seller.id) {
      throw new Error('Reserved DOCS_UAT shop name belongs to another owner');
    }
    shop = existing;
  }

  const avatar = await ensureMedia(prisma, {
    id: DEMO_FIXTURE_IDS.shopAvatarMedia,
    ownerUserId: seller.id,
    resourceType: MediaResourceType.SHOP_AVATAR,
    secureUrl: UAT_IMAGE_URL,
    publicId: 'docs-uat/shop/avatar',
  });
  const banner = await ensureMedia(prisma, {
    id: DEMO_FIXTURE_IDS.shopBannerMedia,
    ownerUserId: seller.id,
    resourceType: MediaResourceType.SHOP_BANNER,
    secureUrl: UAT_BANNER_URL,
    publicId: 'docs-uat/shop/banner',
  });

  const data = {
    ownerUserId: seller.id,
    shopTypeId,
    shopName,
    verifiedLegalName: 'DOCS_UAT Don vi demo',
    registrationType: ShopRegistrationType.NORMAL,
    businessType: 'HOUSEHOLD',
    taxCode: '9990000099',
    phone: UAT_FIXED_PHONE,
    shopStatus: 'verified',
    avatarMediaId: avatar.id,
    bannerMediaId: banner.id,
    warehouseAddress: 'Dia chi kho kiem thu UAT',
    warehouseProvinceCode: 'DOCS-UAT-PROVINCE',
    warehouseProvinceName: 'Tinh kiem thu UAT',
    warehouseWardCode: 'DOCS-UAT-WARD',
    warehouseWardName: 'Phuong kiem thu UAT',
  };

  shop = shop
    ? await prisma.shop.update({ where: { id: shop.id }, data })
    : await prisma.shop.create({
        data: { id: DEMO_FIXTURE_IDS.shop, ...data },
      });

  await prisma.shopBusinessCategory.upsert({
    where: {
      shopId_categoryId: {
        shopId: shop.id,
        categoryId,
      },
    },
    update: { registrationStatus: 'approved', approvedAt: daysAgo(5) },
    create: {
      id: DEMO_FIXTURE_IDS.shopCategory,
      shopId: shop.id,
      categoryId,
      registrationStatus: 'approved',
      approvedAt: daysAgo(5),
    },
  });

  return shop;
}

async function ensureOffer(
  prisma: PrismaClient,
  seller: FixtureAccounts['seller'],
  shopId: string,
  references: ReferenceData,
) {
  const title = assertSyntheticFixtureValue(
    DEMO_FIXTURE_NAMES.offer,
    'offer title',
  );
  let offer = await prisma.offer.findUnique({
    where: { id: DEMO_FIXTURE_IDS.offer },
  });
  if (
    offer &&
    (offer.shopId !== shopId ||
      offer.sellerUserId !== seller.id ||
      offer.title !== title)
  ) {
    throw new Error('Reserved DOCS_UAT offer ID is already occupied');
  }
  if (!offer) {
    const existing = await prisma.offer.findFirst({ where: { title } });
    if (
      existing &&
      (existing.shopId !== shopId || existing.sellerUserId !== seller.id)
    ) {
      throw new Error(
        'Reserved DOCS_UAT offer belongs to another business graph',
      );
    }
    offer = existing;
  }

  const image = await ensureMedia(prisma, {
    id: DEMO_FIXTURE_IDS.offerMedia,
    ownerUserId: seller.id,
    resourceType: MediaResourceType.PRODUCT_IMAGE,
    secureUrl: UAT_IMAGE_URL,
    publicId: 'docs-uat/offer/primary',
  });
  const secondaryImage = await ensureMedia(prisma, {
    id: DEMO_FIXTURE_IDS.offerMediaSecondary,
    ownerUserId: seller.id,
    resourceType: MediaResourceType.PRODUCT_IMAGE,
    secureUrl: UAT_BANNER_URL,
    publicId: 'docs-uat/offer/secondary',
  });

  const data = {
    sellerUserId: seller.id,
    shopId,
    categoryId: references.category.id,
    brandId: references.brand.id,
    modelName: 'DOCS_UAT_MODEL_01',
    gtin: '8900000000099',
    verificationPolicy: 'BATCH_REQUIRED',
    title,
    description:
      'San pham kiem thu UAT phuc vu huong dan gio hang, don hang va xac thuc nguon goc.',
    currency: 'VND',
    itemCondition: 'new',
    offerStatus: 'active',
    moderationStatus: 'approved',
    parcelWeightGrams: 450,
    parcelLengthCm: 12,
    parcelWidthCm: 9,
    parcelHeightCm: 7,
  };

  offer = offer
    ? await prisma.offer.update({ where: { id: offer.id }, data })
    : await prisma.offer.create({
        data: { id: DEMO_FIXTURE_IDS.offer, ...data },
      });

  for (const [media, id, order] of [
    [image, DEMO_FIXTURE_IDS.offerMedia, 0],
    [secondaryImage, DEMO_FIXTURE_IDS.offerMediaSecondary, 1],
  ] as const) {
    await prisma.offerMedia.upsert({
      where: { id },
      update: {
        offerId: offer.id,
        mediaAssetId: media.id,
        mediaType: 'image',
        fileUrl: media.secureUrl,
        phash: `docs-uat-phash-${order + 1}`,
      },
      create: {
        id,
        offerId: offer.id,
        mediaAssetId: media.id,
        mediaType: 'image',
        fileUrl: media.secureUrl,
        phash: `docs-uat-phash-${order + 1}`,
      },
    });
  }

  const group = await prisma.offerOptionGroup.upsert({
    where: {
      offerId_displayName: {
        offerId: offer.id,
        displayName: 'Mau',
      },
    },
    update: {},
    create: {
      id: DEMO_FIXTURE_IDS.optionGroup,
      offerId: offer.id,
      displayName: 'Mau',
    },
  });
  const values = await Promise.all(
    (
      [
        ['UAT Xanh', DEMO_FIXTURE_IDS.optionValuePrimary, 0],
        ['UAT Trang', DEMO_FIXTURE_IDS.optionValueSecondary, 1],
      ] as const
    ).map(async ([text, id, sortOrder]) =>
      prisma.offerOptionValue.upsert({
        where: {
          optionGroupId_text: { optionGroupId: group.id, text },
        },
        update: { sortOrder, isVisible: true },
        create: {
          id,
          optionGroupId: group.id,
          text,
          sortOrder,
          isVisible: true,
        },
      }),
    ),
  );
  const variant = await prisma.offerVariant.upsert({
    where: {
      offerId_sku: { offerId: offer.id, sku: DEMO_FIXTURE_NAMES.variantSku },
    },
    update: {
      price: money(129000),
      availableQuantity: 25,
      isActive: true,
    },
    create: {
      id: DEMO_FIXTURE_IDS.variant,
      offerId: offer.id,
      sku: DEMO_FIXTURE_NAMES.variantSku,
      price: money(129000),
      availableQuantity: 25,
      isActive: true,
    },
  });
  const [primaryValue, secondaryValue] = values;
  if (!primaryValue || !secondaryValue) {
    throw new Error('Reserved DOCS_UAT option values are incomplete');
  }

  const reservedVariantValueRows = await prisma.offerVariantValue.findMany({
    where: {
      id: {
        in: [
          DEMO_FIXTURE_IDS.variantValuePrimary,
          DEMO_FIXTURE_IDS.variantValueSecondary,
        ],
      },
    },
    select: { id: true, variantId: true, optionValueId: true },
  });
  for (const row of reservedVariantValueRows) {
    if (
      row.variantId !== variant.id ||
      ![primaryValue.id, secondaryValue.id].includes(row.optionValueId)
    ) {
      throw new Error('Reserved DOCS_UAT variant-value row is occupied');
    }
  }

  // Keep one valid value for the single option group. The original fixture
  // linked both values from that group to one variant, so the public product
  // UI could never resolve a selection and kept cart actions disabled.
  await prisma.offerVariantValue.deleteMany({
    where: {
      variantId: variant.id,
      optionValueId: secondaryValue.id,
    },
  });
  await prisma.offerVariantValue.upsert({
    where: {
      variantId_optionValueId: {
        variantId: variant.id,
        optionValueId: primaryValue.id,
      },
    },
    update: {},
    create: {
      id: DEMO_FIXTURE_IDS.variantValuePrimary,
      variantId: variant.id,
      optionValueId: primaryValue.id,
    },
  });

  return { offer, variant };
}

async function ensureBuyerState(
  prisma: PrismaClient,
  buyer: FixtureAccounts['buyer'],
  shop: { id: string; shopName: string },
  offer: { id: string; title: string; currency: string },
  variant: { id: string; price: Prisma.Decimal | null },
) {
  const address = await prisma.userAddress.upsert({
    where: { id: DEMO_FIXTURE_IDS.address },
    update: {
      userId: buyer.id,
      recipientName: 'Nguoi nhan Demo UAT 01',
      phone: UAT_SHIPPING_PHONE,
      provinceCode: 'DOCS-UAT-PROVINCE',
      provinceName: 'Tinh kiem thu UAT',
      wardCode: 'DOCS-UAT-WARD',
      wardName: 'Phuong kiem thu UAT',
      addressLine: 'Dia chi giao hang DOCS UAT',
      isDefault: false,
    },
    create: {
      id: DEMO_FIXTURE_IDS.address,
      userId: buyer.id,
      recipientName: 'Nguoi nhan Demo UAT 01',
      phone: UAT_SHIPPING_PHONE,
      provinceCode: 'DOCS-UAT-PROVINCE',
      provinceName: 'Tinh kiem thu UAT',
      wardCode: 'DOCS-UAT-WARD',
      wardName: 'Phuong kiem thu UAT',
      addressLine: 'Dia chi giao hang DOCS UAT',
      isDefault: false,
    },
  });

  const cart = await prisma.cart.upsert({
    where: {
      buyerUserId_cartStatus: { buyerUserId: buyer.id, cartStatus: 'ACTIVE' },
    },
    update: {},
    create: { buyerUserId: buyer.id, cartStatus: 'ACTIVE' },
  });
  await prisma.cartItem.upsert({
    where: { id: DEMO_FIXTURE_IDS.cartItem },
    update: {
      cartId: cart.id,
      offerId: offer.id,
      variantId: variant.id,
      quantity: 1,
      offerTitleSnapshot: offer.title,
      unitPriceSnapshot: variant.price ?? money(0),
      currencySnapshot: offer.currency,
      shopNameSnapshot: shop.shopName,
    },
    create: {
      id: DEMO_FIXTURE_IDS.cartItem,
      cartId: cart.id,
      offerId: offer.id,
      variantId: variant.id,
      quantity: 1,
      offerTitleSnapshot: offer.title,
      unitPriceSnapshot: variant.price ?? money(0),
      currencySnapshot: offer.currency,
      shopNameSnapshot: shop.shopName,
    },
  });

  const existingVoucherByCode = await prisma.voucher.findFirst({
    where: {
      ownerType: VoucherOwnerType.SHOP,
      shopId: shop.id,
      code: DEMO_FIXTURE_NAMES.voucherCode,
    },
    select: { id: true },
  });
  if (
    existingVoucherByCode &&
    existingVoucherByCode.id !== DEMO_FIXTURE_IDS.voucher
  ) {
    throw new Error('Reserved DOCS_UAT voucher code is already occupied');
  }

  const voucher = await prisma.voucher.upsert({
    where: { id: DEMO_FIXTURE_IDS.voucher },
    update: {
      ownerType: VoucherOwnerType.SHOP,
      fundingSource: VoucherFundingSource.SHOP,
      shopId: shop.id,
      code: DEMO_FIXTURE_NAMES.voucherCode,
      name: 'Voucher Demo UAT 10 phan tram',
      discountType: VoucherDiscountType.PERCENTAGE,
      percentage: money(10),
      fixedAmount: null,
      maxDiscountAmount: money(30000),
      minOrderAmount: money(100000),
      scopeType: 'OFFER',
      scopeIds: [offer.id],
      totalUsageLimit: 100,
      userUsageLimit: 2,
      startsAt: daysAgo(1),
      endsAt: daysFromNow(365),
      status: VoucherStatus.ACTIVE,
    },
    create: {
      id: DEMO_FIXTURE_IDS.voucher,
      ownerType: VoucherOwnerType.SHOP,
      fundingSource: VoucherFundingSource.SHOP,
      shopId: shop.id,
      code: DEMO_FIXTURE_NAMES.voucherCode,
      name: 'Voucher Demo UAT 10 phan tram',
      discountType: VoucherDiscountType.PERCENTAGE,
      percentage: money(10),
      fixedAmount: null,
      maxDiscountAmount: money(30000),
      minOrderAmount: money(100000),
      scopeType: 'OFFER',
      scopeIds: [offer.id],
      totalUsageLimit: 100,
      userUsageLimit: 2,
      startsAt: daysAgo(1),
      endsAt: daysFromNow(365),
      status: VoucherStatus.ACTIVE,
    },
  });

  return { address, cart, voucher };
}

async function ensureQrState(
  prisma: PrismaClient,
  seller: FixtureAccounts['seller'],
  offer: {
    id: string;
    shopId: string;
    brandId: string;
    categoryId: string;
    modelName: string;
    gtin: string | null;
    verificationPolicy: string;
  },
  qrCode: string,
) {
  const batch = await prisma.supplyBatch.upsert({
    where: { id: DEMO_FIXTURE_IDS.batch },
    update: {
      shopId: offer.shopId,
      brandId: offer.brandId,
      categoryId: offer.categoryId,
      modelName: offer.modelName,
      gtin: offer.gtin ?? '8900000000099',
      verificationPolicy: offer.verificationPolicy,
      batchNumber: DEMO_FIXTURE_NAMES.batchNumber,
      quantity: 100,
      sourceName: 'DOCS_UAT Nguon demo',
      countryOfOrigin: 'Viet Nam',
      sourceType: 'MANUFACTURING',
      receivedAt: daysAgo(30),
    },
    create: {
      id: DEMO_FIXTURE_IDS.batch,
      shopId: offer.shopId,
      brandId: offer.brandId,
      categoryId: offer.categoryId,
      modelName: offer.modelName,
      gtin: offer.gtin ?? '8900000000099',
      verificationPolicy: offer.verificationPolicy,
      batchNumber: DEMO_FIXTURE_NAMES.batchNumber,
      quantity: 100,
      sourceName: 'DOCS_UAT Nguon demo',
      countryOfOrigin: 'Viet Nam',
      sourceType: 'MANUFACTURING',
      receivedAt: daysAgo(30),
    },
  });
  await prisma.offerBatchLink.upsert({
    where: { offerId_batchId: { offerId: offer.id, batchId: batch.id } },
    update: { allocatedQuantity: 25 },
    create: {
      id: DEMO_FIXTURE_IDS.batchOfferLink,
      offerId: offer.id,
      batchId: batch.id,
      allocatedQuantity: 25,
    },
  });

  const codeHash = sha256(qrCode);
  const collision = await prisma.verificationLabel.findFirst({
    where: { codeHash },
    select: { id: true, scopeId: true },
  });
  if (collision && collision.id !== DEMO_FIXTURE_IDS.verificationLabel) {
    throw new Error(
      'UAT_QR_CODE already belongs to another verification label',
    );
  }

  const label = await prisma.verificationLabel.upsert({
    where: { id: DEMO_FIXTURE_IDS.verificationLabel },
    update: {
      brandId: offer.brandId,
      labelType: 'QR_PRODUCT',
      codeHash,
      issuerType: 'PLATFORM',
      labelStatus: 'active',
      scopeType: 'SUPPLY_BATCH',
      scopeId: batch.id,
      issuedAt: daysAgo(25),
    },
    create: {
      id: DEMO_FIXTURE_IDS.verificationLabel,
      brandId: offer.brandId,
      labelType: 'QR_PRODUCT',
      codeHash,
      issuerType: 'PLATFORM',
      labelStatus: 'active',
      scopeType: 'SUPPLY_BATCH',
      scopeId: batch.id,
      issuedAt: daysAgo(25),
    },
  });
  const existingEvent = await prisma.provenanceEvent.findFirst({
    where: {
      labelId: label.id,
      eventType: 'VERIFIED',
      contextId: batch.id,
    },
  });
  const provenanceEvent = existingEvent
    ? existingEvent
    : await prisma.provenanceEvent.upsert({
        where: { id: DEMO_FIXTURE_IDS.provenanceEvent },
        update: {
          labelId: label.id,
          eventType: 'VERIFIED',
          actorUserId: seller.id,
          actorRole: seller.role,
          channel: 'UAT_FIXTURE',
          contextType: 'SCAN',
          contextId: batch.id,
          payloadHash: sha256(`docs-uat-provenance:${label.id}`),
          occurredAt: daysAgo(2),
        },
        create: {
          id: DEMO_FIXTURE_IDS.provenanceEvent,
          labelId: label.id,
          eventType: 'VERIFIED',
          actorUserId: seller.id,
          actorRole: seller.role,
          channel: 'UAT_FIXTURE',
          contextType: 'SCAN',
          contextId: batch.id,
          payloadHash: sha256(`docs-uat-provenance:${label.id}`),
          occurredAt: daysAgo(2),
        },
      });

  return { batch, label, provenanceEvent };
}

async function ensureOrders(
  prisma: PrismaClient,
  accounts: FixtureAccounts,
  shop: { id: string; shopName: string },
  offer: {
    id: string;
    title: string;
    parcelWeightGrams: number | null;
    parcelLengthCm: number | null;
    parcelWidthCm: number | null;
    parcelHeightCm: number | null;
  },
  variant: { id: string; price: Prisma.Decimal | null },
) {
  const baseAmount = Number(variant.price ?? 129000);
  const platformFee = Math.round(baseAmount * 0.03);
  const totalAmount = baseAmount;
  const results = [] as Array<{
    key: OrderFixture['key'];
    order: { id: string };
  }>;

  for (const fixture of ORDER_FIXTURES) {
    const orderData = {
      buyerUserId: accounts.buyer.id,
      buyerShopId: null,
      buyerDistributionNodeId: null,
      shopId: shop.id,
      orderStatus: fixture.orderStatus,
      fulfillmentStatus: fixture.fulfillmentStatus,
      baseAmount: money(baseAmount),
      discountAmount: money(0),
      platformFeeAmount: money(platformFee),
      buyerPayableAmount: money(totalAmount),
      sellerReceivableAmount: money(baseAmount - platformFee),
      totalAmount: money(totalAmount),
      shippingName: 'Nguoi nhan Demo UAT 01',
      shippingPhone: UAT_SHIPPING_PHONE,
      shippingAddress: `DOCS_UAT Dia chi don hang ${fixture.key}`,
      shippingDistrictId: null,
      shippingDistrictName: 'Quan kiem thu UAT',
      shippingWardCode: 'DOCS-UAT-WARD',
      shippingWardName: 'Phuong kiem thu UAT',
      shippingProviderCode: 'SELF_DELIVERY',
      shippingProviderName: 'Tu van chuyen UAT',
      shippingServiceId: null,
      shippingServiceTypeId: null,
      shippingFeeAmount: money(0),
      shippingTrackingCode: fixture.trackingCode,
      parcelWeightGrams: offer.parcelWeightGrams,
      parcelLengthCm: offer.parcelLengthCm,
      parcelWidthCm: offer.parcelWidthCm,
      parcelHeightCm: offer.parcelHeightCm,
      createdAt: daysAgo(fixture.createdDaysAgo),
    };
    const order = await prisma.order.upsert({
      where: { id: fixture.id },
      update: orderData,
      create: { id: fixture.id, ...orderData },
    });
    const group = await prisma.orderShopGroup.upsert({
      where: { orderId_shopId: { orderId: order.id, shopId: shop.id } },
      update: {
        fulfillmentStatus: fixture.fulfillmentStatus,
        baseAmount: money(baseAmount),
        discountAmount: money(0),
        platformFeeAmount: money(platformFee),
        sellerReceivableAmount: money(baseAmount - platformFee),
        shippingName: order.shippingName,
        shippingPhone: order.shippingPhone,
        shippingAddress: order.shippingAddress,
        shippingDistrictId: null,
        shippingDistrictName: order.shippingDistrictName,
        shippingWardCode: order.shippingWardCode,
        shippingWardName: order.shippingWardName,
        shippingProviderCode: order.shippingProviderCode,
        shippingProviderName: order.shippingProviderName,
        shippingServiceId: null,
        shippingServiceTypeId: null,
        shippingFeeAmount: money(0),
        shippingTrackingCode: fixture.trackingCode,
        parcelWeightGrams: offer.parcelWeightGrams,
        parcelLengthCm: offer.parcelLengthCm,
        parcelWidthCm: offer.parcelWidthCm,
        parcelHeightCm: offer.parcelHeightCm,
      },
      create: {
        id: fixture.groupId,
        orderId: order.id,
        shopId: shop.id,
        fulfillmentStatus: fixture.fulfillmentStatus,
        baseAmount: money(baseAmount),
        discountAmount: money(0),
        platformFeeAmount: money(platformFee),
        sellerReceivableAmount: money(baseAmount - platformFee),
        shippingName: order.shippingName,
        shippingPhone: order.shippingPhone,
        shippingAddress: order.shippingAddress,
        shippingDistrictId: null,
        shippingDistrictName: order.shippingDistrictName,
        shippingWardCode: order.shippingWardCode,
        shippingWardName: order.shippingWardName,
        shippingProviderCode: order.shippingProviderCode,
        shippingProviderName: order.shippingProviderName,
        shippingServiceId: null,
        shippingServiceTypeId: null,
        shippingFeeAmount: money(0),
        shippingTrackingCode: fixture.trackingCode,
        parcelWeightGrams: offer.parcelWeightGrams,
        parcelLengthCm: offer.parcelLengthCm,
        parcelWidthCm: offer.parcelWidthCm,
        parcelHeightCm: offer.parcelHeightCm,
      },
    });
    await prisma.orderItem.upsert({
      where: { id: fixture.itemId },
      update: {
        orderId: order.id,
        orderShopGroupId: group.id,
        offerId: offer.id,
        variantId: variant.id,
        offerTitleSnapshot: offer.title,
        unitPrice: money(baseAmount),
        quantity: 1,
        shopProductDiscountAmount: money(0),
        systemProductDiscountAmount: money(0),
        platformFeeAmount: money(platformFee),
      },
      create: {
        id: fixture.itemId,
        orderId: order.id,
        orderShopGroupId: group.id,
        offerId: offer.id,
        variantId: variant.id,
        offerTitleSnapshot: offer.title,
        unitPrice: money(baseAmount),
        quantity: 1,
        shopProductDiscountAmount: money(0),
        systemProductDiscountAmount: money(0),
        platformFeeAmount: money(platformFee),
      },
    });
    await prisma.paymentIntent.upsert({
      where: { orderId: order.id },
      update: {
        paymentMethod: 'COD',
        paymentStatus: fixture.paymentStatus,
        amount: money(totalAmount),
        providerRef: null,
      },
      create: {
        id: fixture.paymentIntentId,
        orderId: order.id,
        paymentMethod: 'COD',
        paymentStatus: fixture.paymentStatus,
        amount: money(totalAmount),
        providerRef: null,
      },
    });
    await prisma.escrow.upsert({
      where: { orderId: order.id },
      update: {
        escrowStatus:
          fixture.key === 'completed'
            ? 'RELEASED'
            : fixture.key === 'pending'
              ? 'PENDING'
              : 'HELD',
        heldAmount:
          fixture.key === 'pending'
            ? money(0)
            : money(baseAmount - platformFee),
        holdAt:
          fixture.key === 'pending'
            ? null
            : daysAgo(fixture.createdDaysAgo - 1),
        releaseAt: fixture.key === 'completed' ? daysAgo(2) : null,
      },
      create: {
        id: fixture.escrowId,
        orderId: order.id,
        escrowStatus:
          fixture.key === 'completed'
            ? 'RELEASED'
            : fixture.key === 'pending'
              ? 'PENDING'
              : 'HELD',
        heldAmount:
          fixture.key === 'pending'
            ? money(0)
            : money(baseAmount - platformFee),
        holdAt:
          fixture.key === 'pending'
            ? null
            : daysAgo(fixture.createdDaysAgo - 1),
        releaseAt: fixture.key === 'completed' ? daysAgo(2) : null,
      },
    });
    results.push({ key: fixture.key, order: { id: order.id } });
  }
  return results;
}

async function ensureChat(
  prisma: PrismaClient,
  buyer: FixtureAccounts['buyer'],
  seller: FixtureAccounts['seller'],
  shop: { id: string },
) {
  const existingByKey = await prisma.chatThread.findUnique({
    where: { directParticipantKey: DEMO_FIXTURE_NAMES.chatKey },
  });
  const existingByParticipants = await prisma.chatThread.findUnique({
    where: { buyerUserId_shopId: { buyerUserId: buyer.id, shopId: shop.id } },
  });
  if (
    existingByKey &&
    (existingByKey.buyerUserId !== buyer.id ||
      existingByKey.sellerUserId !== seller.id)
  ) {
    throw new Error(
      'Reserved DOCS_UAT chat key belongs to another conversation',
    );
  }
  const thread = existingByKey ?? existingByParticipants;
  const chatThread = thread
    ? await prisma.chatThread.update({
        where: { id: thread.id },
        data: {
          shopId: shop.id,
          directParticipantKey: DEMO_FIXTURE_NAMES.chatKey,
          buyerUserId: buyer.id,
          sellerUserId: seller.id,
        },
      })
    : await prisma.chatThread.create({
        data: {
          id: DEMO_FIXTURE_IDS.chatThread,
          shopId: shop.id,
          directParticipantKey: DEMO_FIXTURE_NAMES.chatKey,
          buyerUserId: buyer.id,
          sellerUserId: seller.id,
          createdAt: daysAgo(8),
        },
      });

  const messages = [
    {
      id: DEMO_FIXTURE_IDS.chatMessageBuyer,
      clientMessageId: 'DOCS_UAT_CHAT_MESSAGE_01',
      senderUserId: buyer.id,
      body: 'Noi dung tro chuyen kiem thu UAT tu nguoi mua.',
      sentAt: daysAgo(3),
    },
    {
      id: DEMO_FIXTURE_IDS.chatMessageSeller,
      clientMessageId: 'DOCS_UAT_CHAT_MESSAGE_02',
      senderUserId: seller.id,
      body: 'Noi dung phan hoi kiem thu UAT tu nguoi ban.',
      sentAt: daysAgo(2),
    },
  ];
  for (const message of messages) {
    await prisma.chatMessage.upsert({
      where: {
        threadId_clientMessageId: {
          threadId: chatThread.id,
          clientMessageId: message.clientMessageId,
        },
      },
      update: {
        senderUserId: message.senderUserId,
        messageType: 'text',
        body: message.body,
        sentAt: message.sentAt,
      },
      create: {
        id: message.id,
        threadId: chatThread.id,
        senderUserId: message.senderUserId,
        clientMessageId: message.clientMessageId,
        messageType: 'text',
        body: message.body,
        sentAt: message.sentAt,
      },
    });
  }
  return chatThread;
}

async function ensureCommunity(
  prisma: PrismaClient,
  buyer: FixtureAccounts['buyer'],
  seller: FixtureAccounts['seller'],
  author: { id: string },
  shop: { id: string },
  offer: { id: string },
) {
  const media = await ensureMedia(prisma, {
    id: DEMO_FIXTURE_IDS.communityMedia,
    ownerUserId: seller.id,
    resourceType: MediaResourceType.SOCIAL_POST,
    secureUrl: UAT_BANNER_URL,
    publicId: 'docs-uat/community/cover',
  });
  const post = await prisma.socialPost.upsert({
    where: { id: DEMO_FIXTURE_IDS.communityPost },
    update: {
      authorUserId: author.id,
      authorShopId: shop.id,
      offerId: offer.id,
      postType: SocialPostType.PRODUCT_SHARE,
      body: DEMO_FIXTURE_NAMES.communityBody,
      visibility: SocialPostVisibility.PUBLIC,
      hiddenAt: null,
      hiddenByUserId: null,
    },
    create: {
      id: DEMO_FIXTURE_IDS.communityPost,
      authorUserId: author.id,
      authorShopId: shop.id,
      offerId: offer.id,
      postType: SocialPostType.PRODUCT_SHARE,
      body: DEMO_FIXTURE_NAMES.communityBody,
      visibility: SocialPostVisibility.PUBLIC,
    },
  });
  await prisma.socialPostMedia.upsert({
    where: {
      postId_mediaAssetId: { postId: post.id, mediaAssetId: media.id },
    },
    update: { sortOrder: 0 },
    create: {
      id: DEMO_FIXTURE_IDS.communityMedia,
      postId: post.id,
      mediaAssetId: media.id,
      sortOrder: 0,
    },
  });
  const comment = await prisma.socialComment.upsert({
    where: { id: DEMO_FIXTURE_IDS.communityComment },
    update: {
      postId: post.id,
      authorUserId: author.id,
      body: 'Binh luan demo phuc vu huong dan tuong tac cong dong.',
      visibility: SocialPostVisibility.PUBLIC,
    },
    create: {
      id: DEMO_FIXTURE_IDS.communityComment,
      postId: post.id,
      authorUserId: buyer.id,
      body: 'Binh luan demo phuc vu huong dan tuong tac cong dong.',
      visibility: SocialPostVisibility.PUBLIC,
    },
  });
  await prisma.socialReaction.upsert({
    where: {
      postId_userId_reactionType: {
        postId: post.id,
        userId: buyer.id,
        reactionType: SocialReactionType.LIKE,
      },
    },
    update: {},
    create: {
      postId: post.id,
      userId: buyer.id,
      reactionType: SocialReactionType.LIKE,
    },
  });

  const secondaryMedia = await ensureMedia(prisma, {
    id: DEMO_FIXTURE_IDS.communityMediaSecondary,
    ownerUserId: author.id,
    resourceType: MediaResourceType.SOCIAL_POST,
    secureUrl: UAT_BANNER_URL,
    publicId: 'docs-uat/community/secondary',
  });
  const secondaryPost = await prisma.socialPost.upsert({
    where: { id: DEMO_FIXTURE_IDS.communityPostSecondary },
    update: {
      authorUserId: author.id,
      authorShopId: shop.id,
      offerId: offer.id,
      postType: SocialPostType.PRODUCT_SHARE,
      body: 'DOCS_UAT: Noi dung mau thu hai cho feed cong dong an toan.',
      visibility: SocialPostVisibility.PUBLIC,
      hiddenAt: null,
      hiddenByUserId: null,
    },
    create: {
      id: DEMO_FIXTURE_IDS.communityPostSecondary,
      authorUserId: author.id,
      authorShopId: shop.id,
      offerId: offer.id,
      postType: SocialPostType.PRODUCT_SHARE,
      body: 'DOCS_UAT: Noi dung mau thu hai cho feed cong dong an toan.',
      visibility: SocialPostVisibility.PUBLIC,
    },
  });
  await prisma.socialPostMedia.upsert({
    where: {
      postId_mediaAssetId: {
        postId: secondaryPost.id,
        mediaAssetId: secondaryMedia.id,
      },
    },
    update: { sortOrder: 0 },
    create: {
      id: DEMO_FIXTURE_IDS.communityMediaSecondary,
      postId: secondaryPost.id,
      mediaAssetId: secondaryMedia.id,
      sortOrder: 0,
    },
  });

  return { post, comment };
}

async function ensureLiveSession(
  prisma: PrismaClient,
  author: { id: string },
  shop: { id: string },
  offer: { id: string },
  voucher: { id: string },
) {
  const existing = await prisma.liveCommerceSession.findUnique({
    where: { id: DEMO_FIXTURE_IDS.liveSession },
    select: { shopId: true, title: true },
  });
  if (
    existing &&
    (existing.shopId !== shop.id ||
      existing.title !== DEMO_FIXTURE_NAMES.liveTitle)
  ) {
    throw new Error('Reserved DOCS_UAT live session ID is already occupied');
  }

  const session = await prisma.liveCommerceSession.upsert({
    where: { id: DEMO_FIXTURE_IDS.liveSession },
    update: {
      shopId: shop.id,
      title: DEMO_FIXTURE_NAMES.liveTitle,
      description: DEMO_FIXTURE_NAMES.liveDescription,
      coverUrl: 'https://picsum.photos/seed/docs-uat-antifake-live/1200/675',
      pinnedOfferId: offer.id,
      startAt: daysFromNow(7),
      status: 'SCHEDULED',
      playbackUrl: null,
      streamProvider: null,
      streamProviderSessionId: null,
      streamIngestUrl: null,
      streamLatencyTargetMs: null,
      providerStatus: null,
      providerEventAt: null,
      providerEventType: null,
      providerErrorCode: null,
      providerErrorMessage: null,
      actualStartedAt: null,
      actualEndedAt: null,
      recordingUrl: null,
      recordingRetentionDays: null,
    },
    create: {
      id: DEMO_FIXTURE_IDS.liveSession,
      shopId: shop.id,
      title: DEMO_FIXTURE_NAMES.liveTitle,
      description: DEMO_FIXTURE_NAMES.liveDescription,
      coverUrl: 'https://picsum.photos/seed/docs-uat-antifake-live/1200/675',
      pinnedOfferId: offer.id,
      startAt: daysFromNow(7),
      status: 'SCHEDULED',
    },
  });

  const existingOfferLink = await prisma.liveSessionOffer.findUnique({
    where: { id: DEMO_FIXTURE_IDS.liveSessionOffer },
    select: { sessionId: true, offerId: true },
  });
  if (
    existingOfferLink &&
    (existingOfferLink.sessionId !== session.id ||
      existingOfferLink.offerId !== offer.id)
  ) {
    throw new Error('Reserved DOCS_UAT live offer link ID is already occupied');
  }
  await prisma.liveSessionOffer.upsert({
    where: { id: DEMO_FIXTURE_IDS.liveSessionOffer },
    update: { sessionId: session.id, offerId: offer.id, sortOrder: 0 },
    create: {
      id: DEMO_FIXTURE_IDS.liveSessionOffer,
      sessionId: session.id,
      offerId: offer.id,
      sortOrder: 0,
    },
  });

  const existingVoucherLink = await prisma.liveSessionVoucher.findUnique({
    where: { id: DEMO_FIXTURE_IDS.liveSessionVoucher },
    select: { sessionId: true, voucherId: true },
  });
  if (
    existingVoucherLink &&
    (existingVoucherLink.sessionId !== session.id ||
      existingVoucherLink.voucherId !== voucher.id)
  ) {
    throw new Error(
      'Reserved DOCS_UAT live voucher link ID is already occupied',
    );
  }
  await prisma.liveSessionVoucher.upsert({
    where: { id: DEMO_FIXTURE_IDS.liveSessionVoucher },
    update: { sessionId: session.id, voucherId: voucher.id, sortOrder: 0 },
    create: {
      id: DEMO_FIXTURE_IDS.liveSessionVoucher,
      sessionId: session.id,
      voucherId: voucher.id,
      sortOrder: 0,
    },
  });

  const existingComment = await prisma.liveSessionComment.findUnique({
    where: { id: DEMO_FIXTURE_IDS.liveSessionComment },
    select: { sessionId: true, authorUserId: true },
  });
  if (
    existingComment &&
    (existingComment.sessionId !== session.id ||
      existingComment.authorUserId !== author.id)
  ) {
    throw new Error('Reserved DOCS_UAT live comment ID is already occupied');
  }
  await prisma.liveSessionComment.upsert({
    where: { id: DEMO_FIXTURE_IDS.liveSessionComment },
    update: {
      sessionId: session.id,
      authorUserId: author.id,
      body: DEMO_FIXTURE_NAMES.liveComment,
      visibility: SocialPostVisibility.PUBLIC,
      clientMessageId: 'DOCS_UAT_LIVE_COMMENT_01',
      hiddenAt: null,
      hiddenByUserId: null,
      createdAt: daysAgo(1),
    },
    create: {
      id: DEMO_FIXTURE_IDS.liveSessionComment,
      sessionId: session.id,
      authorUserId: author.id,
      body: DEMO_FIXTURE_NAMES.liveComment,
      visibility: SocialPostVisibility.PUBLIC,
      clientMessageId: 'DOCS_UAT_LIVE_COMMENT_01',
      createdAt: daysAgo(1),
    },
  });

  return session;
}

async function ensureAffiliate(
  prisma: PrismaClient,
  buyer: FixtureAccounts['buyer'],
  shop: { id: string },
  offer: { id: string; brandId: string },
  completedOrder: { id: string; totalAmount: Prisma.Decimal },
) {
  const program = await prisma.affiliateProgram.upsert({
    where: { slug: DEMO_FIXTURE_NAMES.affiliateSlug },
    update: {
      ownerShopId: shop.id,
      brandId: offer.brandId,
      offerId: offer.id,
      scopeType: AffiliateScopeType.OFFER,
      name: 'Chuong trinh Affiliate Demo UAT',
      programStatus: AffiliateProgramStatus.ACTIVE,
      attributionWindowDays: 30,
      commissionHoldDays: 7,
      commissionModel: 'revenue_share',
      settlementMode: AffiliateSettlementMode.MANUAL,
      tier1Rate: money(10),
      tier2Rate: money(0),
      rulesJson: { namespace: 'DOCS_UAT', payable: false },
      startedAt: daysAgo(10),
    },
    create: {
      id: DEMO_FIXTURE_IDS.affiliateProgram,
      ownerShopId: shop.id,
      brandId: offer.brandId,
      offerId: offer.id,
      scopeType: AffiliateScopeType.OFFER,
      name: 'Chuong trinh Affiliate Demo UAT',
      slug: DEMO_FIXTURE_NAMES.affiliateSlug,
      programStatus: AffiliateProgramStatus.ACTIVE,
      attributionWindowDays: 30,
      commissionHoldDays: 7,
      commissionModel: 'revenue_share',
      settlementMode: AffiliateSettlementMode.MANUAL,
      tier1Rate: money(10),
      tier2Rate: money(0),
      rulesJson: { namespace: 'DOCS_UAT', payable: false },
      startedAt: daysAgo(10),
    },
  });
  const account = await prisma.affiliateAccount.upsert({
    where: { programId_userId: { programId: program.id, userId: buyer.id } },
    update: {
      accountStatus: AffiliateAccountStatus.ACTIVE,
      referralPath: 'DOCS_UAT',
      approvedAt: daysAgo(8),
    },
    create: {
      id: DEMO_FIXTURE_IDS.affiliateAccount,
      programId: program.id,
      userId: buyer.id,
      accountStatus: AffiliateAccountStatus.ACTIVE,
      referralPath: 'DOCS_UAT',
      joinedAt: daysAgo(9),
      approvedAt: daysAgo(8),
    },
  });
  const code = await prisma.affiliateCode.upsert({
    where: { code: DEMO_FIXTURE_NAMES.affiliateCode },
    update: {
      programId: program.id,
      accountId: account.id,
      landingUrl: demoUrl('/products?aff=DOCS-UAT-AFF-01'),
      isDefault: true,
      expiresAt: daysFromNow(365),
    },
    create: {
      id: DEMO_FIXTURE_IDS.affiliateCode,
      programId: program.id,
      accountId: account.id,
      code: DEMO_FIXTURE_NAMES.affiliateCode,
      landingUrl: demoUrl('/products?aff=DOCS-UAT-AFF-01'),
      isDefault: true,
      expiresAt: daysFromNow(365),
    },
  });
  const conversion = await prisma.affiliateConversion.upsert({
    where: { orderId: completedOrder.id },
    update: {
      programId: program.id,
      offerId: offer.id,
      affiliateCodeId: code.id,
      tier1AccountId: account.id,
      tier2AccountId: null,
      customerUserId: buyer.id,
      conversionStatus: AffiliateConversionStatus.APPROVED,
      orderAmount: completedOrder.totalAmount,
      commissionBase: completedOrder.totalAmount,
      metadata: { namespace: 'DOCS_UAT', payable: false },
      approvedAt: daysAgo(5),
    },
    create: {
      id: DEMO_FIXTURE_IDS.affiliateConversion,
      programId: program.id,
      orderId: completedOrder.id,
      offerId: offer.id,
      affiliateCodeId: code.id,
      tier1AccountId: account.id,
      tier2AccountId: null,
      customerUserId: buyer.id,
      conversionStatus: AffiliateConversionStatus.APPROVED,
      orderAmount: completedOrder.totalAmount,
      commissionBase: completedOrder.totalAmount,
      metadata: { namespace: 'DOCS_UAT', payable: false },
      recordedAt: daysAgo(6),
      approvedAt: daysAgo(5),
    },
  });
  const commission = await prisma.affiliateCommissionLedger.upsert({
    where: { id: DEMO_FIXTURE_IDS.affiliateCommission },
    update: {
      conversionId: conversion.id,
      beneficiaryAccountId: account.id,
      beneficiaryType: CommissionBeneficiaryType.AFFILIATE_TIER_1,
      tierLevel: 1,
      amount: money(12900),
      currency: 'VND',
      commissionStatus: AffiliateCommissionStatus.APPROVED,
      lockedAt: null,
      availableAt: daysFromNow(1),
      paidAt: null,
    },
    create: {
      id: DEMO_FIXTURE_IDS.affiliateCommission,
      conversionId: conversion.id,
      beneficiaryAccountId: account.id,
      beneficiaryType: CommissionBeneficiaryType.AFFILIATE_TIER_1,
      tierLevel: 1,
      amount: money(12900),
      currency: 'VND',
      commissionStatus: AffiliateCommissionStatus.APPROVED,
      availableAt: daysFromNow(1),
    },
  });
  return { program, account, code, conversion, commission };
}

async function ensureWallet(prisma: PrismaClient, shop: { id: string }) {
  let wallet = await prisma.wallet.findUnique({
    where: { id: DEMO_FIXTURE_IDS.wallet },
  });
  if (wallet && wallet.shopId !== shop.id) {
    throw new Error('Reserved DOCS_UAT wallet ID is already occupied');
  }
  if (!wallet) {
    const existingByCode = await prisma.wallet.findUnique({
      where: { walletCode: 'DOCS-UAT-WALLET-SHOP' },
    });
    if (existingByCode && existingByCode.shopId !== shop.id) {
      throw new Error('Reserved DOCS_UAT wallet code belongs to another shop');
    }
    const existing =
      existingByCode ??
      (await prisma.wallet.findFirst({
        where: { shopId: shop.id, currency: 'VND' },
      }));
    wallet = existing;
  }
  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: {
        id: DEMO_FIXTURE_IDS.wallet,
        walletCode: 'DOCS-UAT-WALLET-SHOP',
        ownerType: WalletOwnerType.SHOP,
        shopId: shop.id,
        currency: 'VND',
        availableBalance: money(1250000),
        pendingBalance: money(0),
        lockedBalance: money(0),
        status: WalletStatus.ACTIVE,
      },
    });
  } else if (wallet.id === DEMO_FIXTURE_IDS.wallet) {
    wallet = await prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        walletCode: 'DOCS-UAT-WALLET-SHOP',
        ownerType: WalletOwnerType.SHOP,
        shopId: shop.id,
        currency: 'VND',
        availableBalance: money(1250000),
        pendingBalance: money(0),
        lockedBalance: money(0),
        status: WalletStatus.ACTIVE,
      },
    });
  }

  if (wallet.id !== DEMO_FIXTURE_IDS.wallet) return wallet;

  const transaction = await prisma.walletTransaction.upsert({
    where: { id: DEMO_FIXTURE_IDS.walletTransaction },
    update: {
      transactionCode: 'DOCS-UAT-WALLET-TX-01',
      transactionType: WalletTransactionType.ADJUSTMENT,
      status: WalletTransactionStatus.COMPLETED,
      amount: money(1250000),
      currency: 'VND',
      idempotencyKey: 'DOCS-UAT-WALLET-TX-01',
      referenceType: 'UAT_FIXTURE',
      referenceId: DEMO_FIXTURE_IDS.wallet,
      description:
        'Synthetic non-payable UAT ledger balance for documentation.',
      completedAt: daysAgo(4),
    },
    create: {
      id: DEMO_FIXTURE_IDS.walletTransaction,
      transactionCode: 'DOCS-UAT-WALLET-TX-01',
      transactionType: WalletTransactionType.ADJUSTMENT,
      status: WalletTransactionStatus.COMPLETED,
      amount: money(1250000),
      currency: 'VND',
      idempotencyKey: 'DOCS-UAT-WALLET-TX-01',
      referenceType: 'UAT_FIXTURE',
      referenceId: DEMO_FIXTURE_IDS.wallet,
      description:
        'Synthetic non-payable UAT ledger balance for documentation.',
      completedAt: daysAgo(4),
    },
  });
  await prisma.walletLedgerEntry.upsert({
    where: { id: DEMO_FIXTURE_IDS.walletLedgerEntry },
    update: {
      walletId: wallet.id,
      transactionId: transaction.id,
      direction: 'CREDIT',
      balanceType: 'AVAILABLE',
      amount: money(1250000),
      balanceBefore: money(0),
      balanceAfter: money(1250000),
    },
    create: {
      id: DEMO_FIXTURE_IDS.walletLedgerEntry,
      walletId: wallet.id,
      transactionId: transaction.id,
      direction: 'CREDIT',
      balanceType: 'AVAILABLE',
      amount: money(1250000),
      balanceBefore: money(0),
      balanceAfter: money(1250000),
    },
  });
  return wallet;
}

async function ensureAdminReviewSet(
  prisma: PrismaClient,
  references: ReferenceData,
  admin: FixtureAccounts['admin'],
) {
  const reviewUser = await ensureReviewUser(prisma);
  const kyc = await prisma.userKyc.upsert({
    where: { userId: reviewUser.id },
    update: {
      fullName: 'Nguoi dung Demo UAT Review',
      dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
      kycLevel: 'level_1',
      idType: 'UAT_DOCUMENT',
      idNumberHash: sha256('DOCS_UAT_REVIEW_DOCUMENT'),
      verificationStatus: 'pending',
      verifiedAt: null,
      reviewNote: 'Ho so synthetic cho Admin review.',
    },
    create: {
      id: DEMO_FIXTURE_IDS.reviewUserKyc,
      userId: reviewUser.id,
      fullName: 'Nguoi dung Demo UAT Review',
      dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
      kycLevel: 'level_1',
      idType: 'UAT_DOCUMENT',
      idNumberHash: sha256('DOCS_UAT_REVIEW_DOCUMENT'),
      verificationStatus: 'pending',
      reviewNote: 'Ho so synthetic cho Admin review.',
    },
  });
  const submission = await prisma.userKycSubmission.upsert({
    where: {
      userKycId_submissionNumber: { userKycId: kyc.id, submissionNumber: 1 },
    },
    update: {
      verificationStatus: 'pending',
      reviewNote: null,
      reviewedAt: null,
      submittedAt: daysAgo(3),
    },
    create: {
      id: DEMO_FIXTURE_IDS.reviewUserKycSubmission,
      userKycId: kyc.id,
      submissionNumber: 1,
      verificationStatus: 'pending',
      submittedAt: daysAgo(3),
    },
  });
  for (const [side, mediaId, documentId] of [
    [
      KycDocumentSide.FRONT,
      DEMO_FIXTURE_IDS.reviewKycFrontMedia,
      DEMO_FIXTURE_IDS.reviewKycFrontDocument,
    ],
    [
      KycDocumentSide.BACK,
      DEMO_FIXTURE_IDS.reviewKycBackMedia,
      DEMO_FIXTURE_IDS.reviewKycBackDocument,
    ],
  ] as const) {
    const media = await ensureMedia(prisma, {
      id: mediaId,
      ownerUserId: reviewUser.id,
      resourceType: MediaResourceType.KYC_DOCUMENT,
      secureUrl: UAT_DOCUMENT_URL,
      publicId: `docs-uat/kyc/${side.toLowerCase()}`,
      mimeType: 'application/pdf',
      assetType: MediaAssetType.RAW,
    });
    await prisma.userKycDocument.upsert({
      where: { userKycId_side: { userKycId: kyc.id, side } },
      update: { mediaAssetId: media.id },
      create: {
        id: documentId,
        userKycId: kyc.id,
        mediaAssetId: media.id,
        side,
      },
    });
    await prisma.userKycSubmissionDocument.upsert({
      where: { submissionId_side: { submissionId: submission.id, side } },
      update: { mediaAssetId: media.id },
      create: {
        id: documentId,
        submissionId: submission.id,
        mediaAssetId: media.id,
        side,
      },
    });
  }

  const reviewShop = await prisma.shop.upsert({
    where: { id: DEMO_FIXTURE_IDS.reviewShop },
    update: {
      ownerUserId: reviewUser.id,
      shopTypeId: references.shopType.id,
      shopName: DEMO_FIXTURE_NAMES.reviewShop,
      registrationType: ShopRegistrationType.NORMAL,
      businessType: 'HOUSEHOLD',
      taxCode: '9990000100',
      phone: UAT_FIXED_PHONE,
      shopStatus: 'pending_verification',
      warehouseAddress: 'Dia chi kho kiem thu UAT cho duyet',
    },
    create: {
      id: DEMO_FIXTURE_IDS.reviewShop,
      ownerUserId: reviewUser.id,
      shopTypeId: references.shopType.id,
      shopName: DEMO_FIXTURE_NAMES.reviewShop,
      registrationType: ShopRegistrationType.NORMAL,
      businessType: 'HOUSEHOLD',
      taxCode: '9990000100',
      phone: UAT_FIXED_PHONE,
      shopStatus: 'pending_verification',
      warehouseAddress: 'Dia chi kho kiem thu UAT cho duyet',
    },
  });
  await prisma.shopDocument.upsert({
    where: { id: DEMO_FIXTURE_IDS.reviewShopDocument },
    update: {
      shopId: reviewShop.id,
      requirementId: references.requirement.id,
      docType: references.requirement.code,
      reviewStatus: 'pending',
      reviewNote: 'Tai lieu synthetic cho Admin review.',
      reviewedAt: null,
      uploadedAt: daysAgo(2),
    },
    create: {
      id: DEMO_FIXTURE_IDS.reviewShopDocument,
      shopId: reviewShop.id,
      requirementId: references.requirement.id,
      docType: references.requirement.code,
      reviewStatus: 'pending',
      reviewNote: 'Tai lieu synthetic cho Admin review.',
      uploadedAt: daysAgo(2),
    },
  });
  const shopDocumentMedia = await ensureMedia(prisma, {
    id: DEMO_FIXTURE_IDS.reviewShopDocumentMedia,
    ownerUserId: reviewUser.id,
    resourceType: MediaResourceType.SHOP_DOCUMENT,
    secureUrl: UAT_DOCUMENT_URL,
    publicId: 'docs-uat/shop-review/document',
    mimeType: 'application/pdf',
    assetType: MediaAssetType.RAW,
  });
  await prisma.shopDocumentFile.upsert({
    where: { id: DEMO_FIXTURE_IDS.reviewShopDocumentMedia },
    update: {
      shopDocumentId: DEMO_FIXTURE_IDS.reviewShopDocument,
      mediaAssetId: shopDocumentMedia.id,
      fileUrl: shopDocumentMedia.secureUrl,
      sortOrder: 0,
    },
    create: {
      id: DEMO_FIXTURE_IDS.reviewShopDocumentMedia,
      shopDocumentId: DEMO_FIXTURE_IDS.reviewShopDocument,
      mediaAssetId: shopDocumentMedia.id,
      fileUrl: shopDocumentMedia.secureUrl,
      sortOrder: 0,
    },
  });

  const reviewOffer = await prisma.offer.upsert({
    where: { id: DEMO_FIXTURE_IDS.reviewOffer },
    update: {
      sellerUserId: reviewUser.id,
      shopId: reviewShop.id,
      categoryId: references.category.id,
      brandId: references.brand.id,
      modelName: 'DOCS_UAT_REVIEW_MODEL',
      gtin: '8900000000100',
      verificationPolicy: 'BATCH_REQUIRED',
      title: DEMO_FIXTURE_NAMES.reviewOffer,
      description: 'San pham synthetic cho hang doi Admin.',
      currency: 'VND',
      itemCondition: 'new',
      offerStatus: 'draft',
      moderationStatus: 'pending',
    },
    create: {
      id: DEMO_FIXTURE_IDS.reviewOffer,
      sellerUserId: reviewUser.id,
      shopId: reviewShop.id,
      categoryId: references.category.id,
      brandId: references.brand.id,
      modelName: 'DOCS_UAT_REVIEW_MODEL',
      gtin: '8900000000100',
      verificationPolicy: 'BATCH_REQUIRED',
      title: DEMO_FIXTURE_NAMES.reviewOffer,
      description: 'San pham synthetic cho hang doi Admin.',
      currency: 'VND',
      itemCondition: 'new',
      offerStatus: 'draft',
      moderationStatus: 'pending',
    },
  });
  const reviewOfferMedia = await ensureMedia(prisma, {
    id: DEMO_FIXTURE_IDS.reviewOfferMedia,
    ownerUserId: reviewUser.id,
    resourceType: MediaResourceType.PRODUCT_IMAGE,
    secureUrl: UAT_IMAGE_URL,
    publicId: 'docs-uat/offer-review/primary',
  });
  await prisma.offerMedia.upsert({
    where: { id: DEMO_FIXTURE_IDS.reviewOfferMedia },
    update: {
      offerId: reviewOffer.id,
      mediaAssetId: reviewOfferMedia.id,
      mediaType: 'image',
      fileUrl: reviewOfferMedia.secureUrl,
    },
    create: {
      id: DEMO_FIXTURE_IDS.reviewOfferMedia,
      offerId: reviewOffer.id,
      mediaAssetId: reviewOfferMedia.id,
      mediaType: 'image',
      fileUrl: reviewOfferMedia.secureUrl,
    },
  });
  await prisma.offerVariant.upsert({
    where: { id: DEMO_FIXTURE_IDS.reviewOfferVariant },
    update: {
      offerId: reviewOffer.id,
      sku: 'DOCS_UAT_REVIEW_VARIANT',
      price: money(99000),
      availableQuantity: 5,
      isActive: false,
    },
    create: {
      id: DEMO_FIXTURE_IDS.reviewOfferVariant,
      offerId: reviewOffer.id,
      sku: 'DOCS_UAT_REVIEW_VARIANT',
      price: money(99000),
      availableQuantity: 5,
      isActive: false,
    },
  });
  await prisma.moderationCase.upsert({
    where: { id: DEMO_FIXTURE_IDS.reviewModerationCase },
    update: {
      targetType: 'OFFER',
      targetId: reviewOffer.id,
      reason: 'DOCS_UAT synthetic moderation review.',
      caseStatus: 'OPEN',
      internalNote: 'Synthetic Admin queue record; no customer content.',
      assignedAdminUserId: admin.id,
      resolvedAt: null,
    },
    create: {
      id: DEMO_FIXTURE_IDS.reviewModerationCase,
      targetType: 'OFFER',
      targetId: reviewOffer.id,
      reason: 'DOCS_UAT synthetic moderation review.',
      caseStatus: 'OPEN',
      internalNote: 'Synthetic Admin queue record; no customer content.',
      assignedAdminUserId: admin.id,
    },
  });

  return { reviewUser, kyc, reviewShop, reviewOffer };
}

async function main() {
  loadUatEnv();
  const databaseTarget = assertUatDemoDatabaseTarget();
  assertUatDemoDataClassificationConfirmed();
  assertUatDemoFixturePolicy();
  const frontendUrl = assertUatDemoPublicUrl(
    requiredUatSecret('UAT_FRONTEND_PUBLIC_URL'),
  );
  const qrCode = requiredUatSecret('UAT_QR_CODE').trim().toUpperCase();
  if (!/^UAT[-_][A-Z0-9_-]+$/.test(qrCode)) {
    throw new Error('UAT_QR_CODE must use the synthetic UAT namespace');
  }
  const connectionString = requiredUatSecret('DATABASE_URL');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const [buyer, seller, admin, references] = await Promise.all([
      approvedAccount(prisma, DEMO_ACCOUNT_ALIASES.buyer, 'Buyer'),
      approvedAccount(prisma, DEMO_ACCOUNT_ALIASES.seller, 'Seller'),
      approvedAccount(prisma, DEMO_ACCOUNT_ALIASES.admin, 'Admin', 'admin'),
      loadReferenceData(prisma),
    ]);
    const accounts = { buyer, seller, admin };

    const reviewSet = await ensureAdminReviewSet(prisma, references, admin);
    const shop = await ensureApprovedShop(
      prisma,
      seller,
      references.shopType.id,
      references.category.id,
    );
    const catalog = await ensureOffer(prisma, seller, shop.id, references);
    const buyerState = await ensureBuyerState(
      prisma,
      buyer,
      shop,
      catalog.offer,
      catalog.variant,
    );
    const qrState = await ensureQrState(prisma, seller, catalog.offer, qrCode);
    const orders = await ensureOrders(
      prisma,
      accounts,
      shop,
      catalog.offer,
      catalog.variant,
    );
    const chat = await ensureChat(prisma, buyer, seller, shop);
    const community = await ensureCommunity(
      prisma,
      buyer,
      seller,
      reviewSet.reviewUser,
      shop,
      catalog.offer,
    );
    const liveSession = await ensureLiveSession(
      prisma,
      reviewSet.reviewUser,
      shop,
      catalog.offer,
      buyerState.voucher,
    );
    const completedOrder = await prisma.order.findUniqueOrThrow({
      where: { id: DEMO_FIXTURE_IDS.orders.completed },
      select: { id: true, totalAmount: true },
    });
    const affiliate = await ensureAffiliate(
      prisma,
      buyer,
      shop,
      catalog.offer,
      completedOrder,
    );
    const wallet = await ensureWallet(prisma, shop);

    console.log(
      JSON.stringify(
        {
          status: 'PASS',
          environment: 'UAT_DEMO',
          databaseTarget: {
            target: databaseTarget.target,
            databaseName: databaseTarget.databaseName,
            hostname: 'withheld',
          },
          frontendUrl,
          accounts: {
            buyer: DEMO_ACCOUNT_ALIASES.buyer,
            seller: DEMO_ACCOUNT_ALIASES.seller,
            admin: DEMO_ACCOUNT_ALIASES.admin,
            affiliate: DEMO_ACCOUNT_ALIASES.buyer,
          },
          fixtures: {
            shop: shop.id,
            offer: catalog.offer.id,
            variant: catalog.variant.id,
            voucher: buyerState.voucher.id,
            qrBatch: qrState.batch.id,
            qrLabel: qrState.label.id,
            orders: orders.map((item) => ({
              key: item.key,
              id: item.order.id,
            })),
            chat: chat.id,
            community: community.post.id,
            liveSession: liveSession.id,
            affiliate: affiliate.program.id,
            wallet: wallet.id,
            adminReview: {
              user: reviewSet.reviewUser.id,
              shop: reviewSet.reviewShop.id,
              offer: reviewSet.reviewOffer.id,
            },
          },
          sideEffects: {
            payment: 'NONE',
            shipping: 'NONE',
            payout: 'NONE',
            kycProvider: 'NONE',
            livestream: 'NONE',
          },
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : 'UAT demo fixture ensure failed',
  );
  process.exitCode = 1;
});
