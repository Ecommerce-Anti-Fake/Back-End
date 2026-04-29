import 'dotenv/config';
import { pbkdf2Sync, randomBytes } from 'crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { MediaAssetType, MediaProvider, MediaResourceType, OfferSalesMode, PrismaClient, ShopRegistrationType } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

async function seedShopTypesAndRequirements() {
  const shopTypes = [
    {
      id: 'shop-type-normal',
      code: 'NORMAL',
      name: 'Shop thường',
      description: 'Bán lẻ thông thường trên sàn.',
      sortOrder: 10,
    },
    {
      id: 'shop-type-handmade',
      code: 'HANDMADE',
      name: 'Shop thủ công',
      description: 'Bán sản phẩm tự làm hoặc sản phẩm thủ công.',
      sortOrder: 20,
    },
    {
      id: 'shop-type-manufacturer',
      code: 'MANUFACTURER',
      name: 'Nhà sản xuất',
      description: 'Sản xuất, bán sỉ/lẻ và có thể mở kênh phân phối.',
      sortOrder: 30,
    },
    {
      id: 'shop-type-distributor',
      code: 'DISTRIBUTOR',
      name: 'Đại lý phân phối',
      description: 'Mua sỉ, phân phối hoặc bán lại hàng hóa được ủy quyền.',
      sortOrder: 40,
    },
  ];

  for (const shopType of shopTypes) {
    await prisma.shopType.upsert({
      where: { id: shopType.id },
      update: {
        code: shopType.code,
        name: shopType.name,
        description: shopType.description,
        sortOrder: shopType.sortOrder,
        isActive: true,
      },
      create: {
        ...shopType,
        isActive: true,
      },
    });
  }

  const requirements = [
    {
      id: 'req-business-license',
      code: 'BUSINESS_LICENSE',
      name: 'Giấy phép kinh doanh',
      description: 'Ảnh hoặc bản scan giấy phép kinh doanh/hộ kinh doanh còn hiệu lực.',
      multipleFilesAllowed: true,
    },
    {
      id: 'req-tax-registration',
      code: 'TAX_REGISTRATION',
      name: 'Giấy đăng ký thuế',
      description: 'Tài liệu chứng minh mã số thuế hoặc thông tin đăng ký thuế.',
      multipleFilesAllowed: true,
    },
    {
      id: 'req-manufacturing-certificate',
      code: 'MANUFACTURING_CERTIFICATE',
      name: 'Giấy chứng minh cơ sở sản xuất',
      description: 'Giấy chứng nhận đủ điều kiện sản xuất, ảnh cơ sở hoặc tài liệu tương đương.',
      multipleFilesAllowed: true,
    },
    {
      id: 'req-distribution-license',
      code: 'DISTRIBUTION_LICENSE',
      name: 'Giấy phép phân phối',
      description: 'Giấy ủy quyền, hợp đồng phân phối hoặc tài liệu chứng minh quyền phân phối.',
      multipleFilesAllowed: true,
    },
    {
      id: 'req-handmade-proof',
      code: 'HANDMADE_PROOF',
      name: 'Bằng chứng sản phẩm thủ công',
      description: 'Ảnh quy trình sản xuất, cam kết sản phẩm thủ công hoặc tài liệu liên quan.',
      multipleFilesAllowed: true,
    },
  ];

  for (const requirement of requirements) {
    await prisma.verificationRequirement.upsert({
      where: { id: requirement.id },
      update: {
        code: requirement.code,
        name: requirement.name,
        description: requirement.description,
        multipleFilesAllowed: requirement.multipleFilesAllowed,
        isActive: true,
      },
      create: {
        ...requirement,
        isActive: true,
      },
    });
  }

  const mappings = [
    ['str-handmade-proof', 'shop-type-handmade', 'req-handmade-proof', true, 10],
    ['str-manufacturer-business-license', 'shop-type-manufacturer', 'req-business-license', true, 10],
    ['str-manufacturer-tax-registration', 'shop-type-manufacturer', 'req-tax-registration', true, 20],
    ['str-manufacturer-certificate', 'shop-type-manufacturer', 'req-manufacturing-certificate', true, 30],
    ['str-distributor-business-license', 'shop-type-distributor', 'req-business-license', true, 10],
    ['str-distributor-tax-registration', 'shop-type-distributor', 'req-tax-registration', false, 20],
    ['str-distributor-license', 'shop-type-distributor', 'req-distribution-license', true, 30],
  ] as const;

  for (const [id, shopTypeId, requirementId, required, sortOrder] of mappings) {
    await prisma.shopTypeRequirement.upsert({
      where: { id },
      update: {
        shopTypeId,
        requirementId,
        required,
        sortOrder,
        isActive: true,
      },
      create: {
        id,
        shopTypeId,
        requirementId,
        required,
        sortOrder,
        isActive: true,
      },
    });
  }
}

async function seedCatalog() {
  const categories = [
    { id: 'cat-food', name: 'Thực phẩm an toàn', riskTier: 'medium' },
    { id: 'cat-cosmetic', name: 'Mỹ phẩm chính hãng', riskTier: 'high' },
    { id: 'cat-household', name: 'Đồ gia dụng', riskTier: 'low' },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { id: category.id },
      update: {
        name: category.name,
        riskTier: category.riskTier,
      },
      create: category,
    });
  }

  const brands = [
    { id: 'brand-abc-food', name: 'ABC Food', registryStatus: 'approved' },
    { id: 'brand-green-home', name: 'Green Home', registryStatus: 'approved' },
  ];

  for (const brand of brands) {
    await prisma.brand.upsert({
      where: { id: brand.id },
      update: {
        name: brand.name,
        registryStatus: brand.registryStatus,
      },
      create: brand,
    });
  }

  await prisma.productModel.upsert({
    where: { id: 'model-organic-cashew' },
    update: {
      modelName: 'Hạt điều rang muối hữu cơ 500g',
      verificationPolicy: 'STANDARD',
      approvalStatus: 'approved',
    },
    create: {
      id: 'model-organic-cashew',
      brandId: 'brand-abc-food',
      categoryId: 'cat-food',
      modelName: 'Hạt điều rang muối hữu cơ 500g',
      gtin: '8930000000011',
      verificationPolicy: 'STANDARD',
      approvalStatus: 'approved',
    },
  });

  await prisma.productModel.upsert({
    where: { id: 'model-herbal-soap' },
    update: {
      modelName: 'Xà phòng thảo mộc handmade',
      verificationPolicy: 'STANDARD',
      approvalStatus: 'approved',
    },
    create: {
      id: 'model-herbal-soap',
      brandId: 'brand-green-home',
      categoryId: 'cat-household',
      modelName: 'Xà phòng thảo mộc handmade',
      gtin: '8930000000028',
      verificationPolicy: 'STANDARD',
      approvalStatus: 'approved',
    },
  });
}

async function seedUsersAndShops() {
  const password = hashPassword('12345678');

  await prisma.user.upsert({
    where: { id: 'user-demo-buyer' },
    update: {
      email: 'buyer@example.com',
      displayName: 'Người mua mẫu',
      accountStatus: 'active',
    },
    create: {
      id: 'user-demo-buyer',
      email: 'buyer@example.com',
      phone: '0900000001',
      displayName: 'Người mua mẫu',
      password,
      role: 'user',
      accountStatus: 'active',
    },
  });

  await prisma.user.upsert({
    where: { id: 'user-demo-manufacturer' },
    update: {
      email: 'manufacturer@example.com',
      displayName: 'Công ty sản xuất mẫu',
      accountStatus: 'active',
    },
    create: {
      id: 'user-demo-manufacturer',
      email: 'manufacturer@example.com',
      phone: '0900000002',
      displayName: 'Công ty sản xuất mẫu',
      password,
      role: 'user',
      accountStatus: 'active',
    },
  });

  await prisma.user.upsert({
    where: { id: 'user-demo-admin' },
    update: {
      email: 'admin@example.com',
      displayName: 'Admin mẫu',
      role: 'admin',
      accountStatus: 'active',
    },
    create: {
      id: 'user-demo-admin',
      email: 'admin@example.com',
      phone: '0900000003',
      displayName: 'Admin mẫu',
      password,
      role: 'admin',
      accountStatus: 'active',
    },
  });

  await prisma.shop.upsert({
    where: { id: 'shop-demo-manufacturer' },
    update: {
      ownerUserId: 'user-demo-manufacturer',
      shopTypeId: 'shop-type-manufacturer',
      shopName: 'Công ty TNHH Sản Xuất ABC',
      registrationType: ShopRegistrationType.MANUFACTURER,
      businessType: 'COMPANY',
      taxCode: '0123456789',
      shopStatus: 'pending_verification',
    },
    create: {
      id: 'shop-demo-manufacturer',
      ownerUserId: 'user-demo-manufacturer',
      shopTypeId: 'shop-type-manufacturer',
      shopName: 'Công ty TNHH Sản Xuất ABC',
      registrationType: ShopRegistrationType.MANUFACTURER,
      businessType: 'COMPANY',
      taxCode: '0123456789',
      shopStatus: 'pending_verification',
    },
  });

  const shopCategories = [
    { id: 'shop-demo-manufacturer-cat-food', shopId: 'shop-demo-manufacturer', categoryId: 'cat-food' },
    { id: 'shop-demo-manufacturer-cat-household', shopId: 'shop-demo-manufacturer', categoryId: 'cat-household' },
  ];

  for (const item of shopCategories) {
    await prisma.shopBusinessCategory.upsert({
      where: { id: item.id },
      update: {
        shopId: item.shopId,
        categoryId: item.categoryId,
        registrationStatus: 'pending',
      },
      create: {
        ...item,
        registrationStatus: 'pending',
      },
    });
  }
}

async function seedOffers() {
  await prisma.mediaAsset.upsert({
    where: { id: 'media-offer-cashew-1' },
    update: {
      secureUrl: 'https://images.unsplash.com/photo-1606923829579-0cb981a83e2e?auto=format&fit=crop&w=900&q=80',
      mimeType: 'image/jpeg',
    },
    create: {
      id: 'media-offer-cashew-1',
      ownerUserId: 'user-demo-manufacturer',
      provider: MediaProvider.CLOUDINARY,
      assetType: MediaAssetType.IMAGE,
      resourceType: MediaResourceType.PRODUCT_IMAGE,
      publicId: 'seed/offers/cashew',
      secureUrl: 'https://images.unsplash.com/photo-1606923829579-0cb981a83e2e?auto=format&fit=crop&w=900&q=80',
      mimeType: 'image/jpeg',
      folder: 'seed/offers',
    },
  });

  await prisma.offer.upsert({
    where: { id: 'offer-organic-cashew-retail' },
    update: {
      title: 'Hạt điều rang muối hữu cơ 500g',
      price: '129000',
      availableQuantity: 120,
      offerStatus: 'active',
    },
    create: {
      id: 'offer-organic-cashew-retail',
      sellerUserId: 'user-demo-manufacturer',
      shopId: 'shop-demo-manufacturer',
      categoryId: 'cat-food',
      productModelId: 'model-organic-cashew',
      title: 'Hạt điều rang muối hữu cơ 500g',
      description: 'Hạt điều tuyển chọn, truy xuất nguồn gốc theo lô sản xuất mẫu.',
      price: '129000',
      currency: 'VND',
      salesMode: OfferSalesMode.BOTH,
      minWholesaleQty: 20,
      itemCondition: 'new',
      availableQuantity: 120,
      verificationLevel: 'verified',
      offerStatus: 'active',
    },
  });

  await prisma.offerMedia.upsert({
    where: { id: 'offer-media-cashew-1' },
    update: {
      fileUrl: 'https://images.unsplash.com/photo-1606923829579-0cb981a83e2e?auto=format&fit=crop&w=900&q=80',
    },
    create: {
      id: 'offer-media-cashew-1',
      offerId: 'offer-organic-cashew-retail',
      mediaAssetId: 'media-offer-cashew-1',
      mediaType: 'image',
      fileUrl: 'https://images.unsplash.com/photo-1606923829579-0cb981a83e2e?auto=format&fit=crop&w=900&q=80',
    },
  });
}

async function main() {
  await seedShopTypesAndRequirements();
  await seedCatalog();
  await seedUsersAndShops();
  await seedOffers();
}

main()
  .then(async () => {
    console.log('Seed data created.');
    console.log('Demo accounts: buyer@example.com / 12345678, manufacturer@example.com / 12345678, admin@example.com / 12345678');
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
