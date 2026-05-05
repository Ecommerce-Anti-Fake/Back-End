import 'dotenv/config';
import { pbkdf2Sync, randomBytes } from 'crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { MediaAssetType, MediaProvider, MediaResourceType, OfferSalesMode, OrderMode, PrismaClient, ShopRegistrationType } from '@prisma/client';

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

  await prisma.user.upsert({
    where: { id: 'user-demo-distributor' },
    update: {
      email: 'distributor@example.com',
      displayName: 'Nha phan phoi mau',
      accountStatus: 'active',
    },
    create: {
      id: 'user-demo-distributor',
      email: 'distributor@example.com',
      phone: '0900000004',
      displayName: 'Nha phan phoi mau',
      password,
      role: 'user',
      accountStatus: 'active',
    },
  });

  await prisma.userAddress.upsert({
    where: { id: 'address-demo-buyer-default' },
    update: {
      userId: 'user-demo-buyer',
      recipientName: 'Người mua mẫu',
      phone: '0900000001',
      addressLine: '12 Nguyễn Trãi, Quận 1, TP.HCM',
      isDefault: true,
    },
    create: {
      id: 'address-demo-buyer-default',
      userId: 'user-demo-buyer',
      recipientName: 'Người mua mẫu',
      phone: '0900000001',
      addressLine: '12 Nguyễn Trãi, Quận 1, TP.HCM',
      isDefault: true,
    },
  });

  await prisma.userAddress.upsert({
    where: { id: 'address-demo-buyer-office' },
    update: {
      userId: 'user-demo-buyer',
      recipientName: 'Người mua mẫu',
      phone: '0900000001',
      addressLine: 'Tòa nhà ABC, Phường Bến Nghé, Quận 1, TP.HCM',
      isDefault: false,
    },
    create: {
      id: 'address-demo-buyer-office',
      userId: 'user-demo-buyer',
      recipientName: 'Người mua mẫu',
      phone: '0900000001',
      addressLine: 'Tòa nhà ABC, Phường Bến Nghé, Quận 1, TP.HCM',
      isDefault: false,
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

  await prisma.shop.upsert({
    where: { id: 'shop-demo-distributor' },
    update: {
      ownerUserId: 'user-demo-distributor',
      shopTypeId: 'shop-type-distributor',
      shopName: 'Dai Ly Phan Phoi Sai Gon',
      registrationType: ShopRegistrationType.DISTRIBUTOR,
      businessType: 'COMPANY',
      taxCode: '0987654321',
      shopStatus: 'verified',
    },
    create: {
      id: 'shop-demo-distributor',
      ownerUserId: 'user-demo-distributor',
      shopTypeId: 'shop-type-distributor',
      shopName: 'Dai Ly Phan Phoi Sai Gon',
      registrationType: ShopRegistrationType.DISTRIBUTOR,
      businessType: 'COMPANY',
      taxCode: '0987654321',
      shopStatus: 'verified',
    },
  });

  const shopCategories = [
    { id: 'shop-demo-manufacturer-cat-food', shopId: 'shop-demo-manufacturer', categoryId: 'cat-food' },
    { id: 'shop-demo-manufacturer-cat-household', shopId: 'shop-demo-manufacturer', categoryId: 'cat-household' },
    { id: 'shop-demo-distributor-cat-food', shopId: 'shop-demo-distributor', categoryId: 'cat-food' },
    { id: 'shop-demo-distributor-cat-household', shopId: 'shop-demo-distributor', categoryId: 'cat-household' },
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
      salesMode: OfferSalesMode.RETAIL,
      minWholesaleQty: null,
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

const sampleProducts = [
  {
    id: 'sample-model-01',
    offerId: 'sample-offer-retail-01',
    mediaId: 'sample-media-retail-01',
    offerMediaId: 'sample-offer-media-retail-01',
    brandId: 'brand-abc-food',
    categoryId: 'cat-food',
    modelName: 'Gio lua nac Au Lac goi 250g',
    title: 'Gio lua nac Au Lac - Goi 250g',
    description: 'Gio lua nac tu thit heo tuoi, dong goi tien loi cho bua an gia dinh.',
    price: 66000,
    quantity: 240,
    salesMode: OfferSalesMode.RETAIL,
    imageUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'sample-model-02',
    offerId: 'sample-offer-retail-02',
    mediaId: 'sample-media-retail-02',
    offerMediaId: 'sample-offer-media-retail-02',
    brandId: 'brand-abc-food',
    categoryId: 'cat-food',
    modelName: 'Nem chua Ha Thanh hop 500g',
    title: 'Nem chua Ha Thanh - Hop 500g',
    description: 'Nem chua dong hop, co tem truy xuat va thong tin lo san xuat.',
    price: 41800,
    quantity: 180,
    salesMode: OfferSalesMode.RETAIL,
    imageUrl: 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'sample-model-03',
    offerId: 'sample-offer-retail-03',
    mediaId: 'sample-media-retail-03',
    offerMediaId: 'sample-offer-media-retail-03',
    brandId: 'brand-green-home',
    categoryId: 'cat-household',
    modelName: 'Nuoc rua chen thao moc 750ml',
    title: 'Nuoc rua chen thao moc Green Home 750ml',
    description: 'Cong thuc thao moc, phu hop su dung hang ngay trong gia dinh.',
    price: 59000,
    quantity: 300,
    salesMode: OfferSalesMode.RETAIL,
    imageUrl: 'https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'sample-model-04',
    offerId: 'sample-offer-retail-04',
    mediaId: 'sample-media-retail-04',
    offerMediaId: 'sample-offer-media-retail-04',
    brandId: 'brand-green-home',
    categoryId: 'cat-cosmetic',
    modelName: 'Sua tam gao non 500ml',
    title: 'Sua tam gao non duong am 500ml',
    description: 'Sua tam huong gao non, co ho so nguon goc nguyen lieu.',
    price: 89000,
    quantity: 160,
    salesMode: OfferSalesMode.RETAIL,
    imageUrl: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'sample-model-05',
    offerId: 'sample-offer-retail-05',
    mediaId: 'sample-media-retail-05',
    offerMediaId: 'sample-offer-media-retail-05',
    brandId: 'brand-abc-food',
    categoryId: 'cat-food',
    modelName: 'Tra atiso Da Lat hop 20 tui',
    title: 'Tra atiso Da Lat - Hop 20 tui loc',
    description: 'Tra atiso Da Lat dong hop, kiem tra nguon goc theo ma lo.',
    price: 72000,
    quantity: 210,
    salesMode: OfferSalesMode.RETAIL,
    imageUrl: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'sample-model-06',
    offerId: 'sample-offer-wholesale-01',
    mediaId: 'sample-media-wholesale-01',
    offerMediaId: 'sample-offer-media-wholesale-01',
    brandId: 'brand-abc-food',
    categoryId: 'cat-food',
    modelName: 'Thung gio lua Au Lac 40 goi',
    title: 'Thung gio lua Au Lac - 40 goi',
    description: 'Lo hang danh cho nha phan phoi, moi thung gom 40 goi 250g.',
    price: 2300000,
    quantity: 80,
    salesMode: OfferSalesMode.WHOLESALE,
    minWholesaleQty: 5,
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'sample-model-07',
    offerId: 'sample-offer-wholesale-02',
    mediaId: 'sample-media-wholesale-02',
    offerMediaId: 'sample-offer-media-wholesale-02',
    brandId: 'brand-abc-food',
    categoryId: 'cat-food',
    modelName: 'Lo hat dieu huu co 24 hop',
    title: 'Lo hat dieu huu co - 24 hop 500g',
    description: 'Gia nhap si cho dai ly, san pham co chung tu va batch san xuat.',
    price: 2580000,
    quantity: 60,
    salesMode: OfferSalesMode.WHOLESALE,
    minWholesaleQty: 4,
    imageUrl: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'sample-model-08',
    offerId: 'sample-offer-wholesale-03',
    mediaId: 'sample-media-wholesale-03',
    offerMediaId: 'sample-offer-media-wholesale-03',
    brandId: 'brand-green-home',
    categoryId: 'cat-household',
    modelName: 'Combo nuoc rua chen 60 chai',
    title: 'Combo nuoc rua chen thao moc - 60 chai',
    description: 'Goi nhap si cho cua hang tap hoa va dai ly phan phoi.',
    price: 2850000,
    quantity: 45,
    salesMode: OfferSalesMode.WHOLESALE,
    minWholesaleQty: 3,
    imageUrl: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'sample-model-09',
    offerId: 'sample-offer-wholesale-04',
    mediaId: 'sample-media-wholesale-04',
    offerMediaId: 'sample-offer-media-wholesale-04',
    brandId: 'brand-green-home',
    categoryId: 'cat-cosmetic',
    modelName: 'Lo sua tam gao non 36 chai',
    title: 'Lo sua tam gao non - 36 chai',
    description: 'Gia si cho kenh ban le my pham, co ho so xac thuc san pham.',
    price: 2700000,
    quantity: 50,
    salesMode: OfferSalesMode.WHOLESALE,
    minWholesaleQty: 3,
    imageUrl: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'sample-model-10',
    offerId: 'sample-offer-wholesale-05',
    mediaId: 'sample-media-wholesale-05',
    offerMediaId: 'sample-offer-media-wholesale-05',
    brandId: 'brand-abc-food',
    categoryId: 'cat-food',
    modelName: 'Lo tra atiso Da Lat 50 hop',
    title: 'Lo tra atiso Da Lat - 50 hop',
    description: 'Lo hang si phu hop cho dai ly thuc pham sach va cua hang dac san.',
    price: 3150000,
    quantity: 55,
    salesMode: OfferSalesMode.WHOLESALE,
    minWholesaleQty: 2,
    imageUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=900&q=80',
  },
] as const;

async function seedDemoProductsAndOffers() {
  for (const product of sampleProducts) {
    await prisma.productModel.upsert({
      where: { id: product.id },
      update: {
        brandId: product.brandId,
        categoryId: product.categoryId,
        modelName: product.modelName,
        verificationPolicy: 'STANDARD',
        approvalStatus: 'approved',
      },
      create: {
        id: product.id,
        brandId: product.brandId,
        categoryId: product.categoryId,
        modelName: product.modelName,
        gtin: `8931000000${product.id.slice(-2)}`,
        verificationPolicy: 'STANDARD',
        approvalStatus: 'approved',
      },
    });

    await prisma.mediaAsset.upsert({
      where: { id: product.mediaId },
      update: {
        secureUrl: product.imageUrl,
        mimeType: 'image/jpeg',
      },
      create: {
        id: product.mediaId,
        ownerUserId: 'user-demo-manufacturer',
        provider: MediaProvider.CLOUDINARY,
        assetType: MediaAssetType.IMAGE,
        resourceType: MediaResourceType.PRODUCT_IMAGE,
        publicId: `seed/offers/${product.offerId}`,
        secureUrl: product.imageUrl,
        mimeType: 'image/jpeg',
        folder: 'seed/offers',
      },
    });

    await prisma.offer.upsert({
      where: { id: product.offerId },
      update: {
        categoryId: product.categoryId,
        productModelId: product.id,
        title: product.title,
        description: product.description,
        price: String(product.price),
        salesMode: product.salesMode,
        minWholesaleQty: 'minWholesaleQty' in product ? product.minWholesaleQty : null,
        availableQuantity: product.quantity,
        verificationLevel: 'verified',
        offerStatus: 'active',
      },
      create: {
        id: product.offerId,
        sellerUserId: 'user-demo-manufacturer',
        shopId: 'shop-demo-manufacturer',
        categoryId: product.categoryId,
        productModelId: product.id,
        title: product.title,
        description: product.description,
        price: String(product.price),
        currency: 'VND',
        salesMode: product.salesMode,
        minWholesaleQty: 'minWholesaleQty' in product ? product.minWholesaleQty : null,
        itemCondition: 'new',
        availableQuantity: product.quantity,
        verificationLevel: 'verified',
        offerStatus: 'active',
      },
    });

    await prisma.offerMedia.upsert({
      where: { id: product.offerMediaId },
      update: {
        offerId: product.offerId,
        mediaAssetId: product.mediaId,
        fileUrl: product.imageUrl,
      },
      create: {
        id: product.offerMediaId,
        offerId: product.offerId,
        mediaAssetId: product.mediaId,
        mediaType: 'image',
        fileUrl: product.imageUrl,
      },
    });
  }
}

async function seedDemoOrders() {
  const retailOffers = sampleProducts.filter((product) => product.salesMode === OfferSalesMode.RETAIL);
  const wholesaleOffers = sampleProducts.filter((product) => product.salesMode === OfferSalesMode.WHOLESALE);
  const statuses = [
    { orderStatus: 'pending', fulfillmentStatus: 'PENDING' },
    { orderStatus: 'paid', fulfillmentStatus: 'PROCESSING' },
    { orderStatus: 'shipping', fulfillmentStatus: 'SHIPPING' },
    { orderStatus: 'completed', fulfillmentStatus: 'DELIVERED' },
    { orderStatus: 'cancelled', fulfillmentStatus: 'CANCELLED' },
  ];

  async function upsertOrder(input: {
    id: string;
    offer: (typeof sampleProducts)[number];
    mode: OrderMode;
    quantity: number;
    index: number;
  }) {
    const amount = input.offer.price * input.quantity;
    const fee = Math.round(amount * 0.03);
    const status = statuses[input.index % statuses.length];

    await prisma.order.upsert({
      where: { id: input.id },
      update: {
        buyerUserId: input.mode === OrderMode.RETAIL ? 'user-demo-buyer' : 'user-demo-distributor',
        buyerShopId: input.mode === OrderMode.WHOLESALE ? 'shop-demo-distributor' : null,
        shopId: 'shop-demo-manufacturer',
        orderMode: input.mode,
        orderType: input.mode === OrderMode.RETAIL ? 'DIRECT_RETAIL' : 'DIRECT_WHOLESALE',
        orderStatus: status.orderStatus,
        fulfillmentStatus: status.fulfillmentStatus,
        baseAmount: String(amount),
        platformFeeAmount: String(fee),
        buyerPayableAmount: String(amount),
        sellerReceivableAmount: String(amount - fee),
        totalAmount: String(amount),
      },
      create: {
        id: input.id,
        buyerUserId: input.mode === OrderMode.RETAIL ? 'user-demo-buyer' : 'user-demo-distributor',
        buyerShopId: input.mode === OrderMode.WHOLESALE ? 'shop-demo-distributor' : null,
        buyerDistributionNodeId: null,
        shopId: 'shop-demo-manufacturer',
        orderMode: input.mode,
        orderType: input.mode === OrderMode.RETAIL ? 'DIRECT_RETAIL' : 'DIRECT_WHOLESALE',
        orderStatus: status.orderStatus,
        fulfillmentStatus: status.fulfillmentStatus,
        baseAmount: String(amount),
        discountAmount: '0',
        platformFeeAmount: String(fee),
        buyerPayableAmount: String(amount),
        sellerReceivableAmount: String(amount - fee),
        totalAmount: String(amount),
        shippingName: input.mode === OrderMode.RETAIL ? 'Nguoi mua mau' : 'Dai Ly Phan Phoi Sai Gon',
        shippingPhone: input.mode === OrderMode.RETAIL ? '0900000001' : '0900000004',
        shippingAddress: input.mode === OrderMode.RETAIL ? '12 Nguyen Trai, Quan 1, TP.HCM' : 'Kho B2, KCN Tan Binh, TP.HCM',
      },
    });

    await prisma.orderItem.upsert({
      where: { id: `${input.id}-item` },
      update: {
        offerId: input.offer.offerId,
        offerTitleSnapshot: input.offer.title,
        unitPrice: String(input.offer.price),
        quantity: input.quantity,
        verificationLevelSnapshot: 'verified',
      },
      create: {
        id: `${input.id}-item`,
        orderId: input.id,
        offerId: input.offer.offerId,
        offerTitleSnapshot: input.offer.title,
        unitPrice: String(input.offer.price),
        quantity: input.quantity,
        verificationLevelSnapshot: 'verified',
      },
    });

    await prisma.paymentIntent.upsert({
      where: { orderId: input.id },
      update: {
        paymentMethod: input.mode === OrderMode.RETAIL ? 'COD' : 'BANK_TRANSFER',
        paymentStatus: status.orderStatus === 'paid' || status.orderStatus === 'completed' ? 'PAID' : 'PENDING',
        amount: String(amount),
      },
      create: {
        orderId: input.id,
        paymentMethod: input.mode === OrderMode.RETAIL ? 'COD' : 'BANK_TRANSFER',
        paymentStatus: status.orderStatus === 'paid' || status.orderStatus === 'completed' ? 'PAID' : 'PENDING',
        amount: String(amount),
      },
    });

    await prisma.escrow.upsert({
      where: { orderId: input.id },
      update: {
        escrowStatus: status.orderStatus === 'completed' ? 'RELEASED' : 'PENDING',
        heldAmount: status.orderStatus === 'paid' ? String(amount) : '0',
      },
      create: {
        orderId: input.id,
        escrowStatus: status.orderStatus === 'completed' ? 'RELEASED' : 'PENDING',
        heldAmount: status.orderStatus === 'paid' ? String(amount) : '0',
      },
    });
  }

  for (const [index, offer] of retailOffers.entries()) {
    await upsertOrder({
      id: `sample-order-retail-0${index + 1}`,
      offer,
      mode: OrderMode.RETAIL,
      quantity: index + 1,
      index,
    });
  }

  for (const [index, offer] of wholesaleOffers.entries()) {
    await upsertOrder({
      id: `sample-order-wholesale-0${index + 1}`,
      offer,
      mode: OrderMode.WHOLESALE,
      quantity: offer.minWholesaleQty ?? 2,
      index,
    });
  }
}

async function main() {
  await seedShopTypesAndRequirements();
  await seedCatalog();
  await seedUsersAndShops();
  await seedOffers();
  await seedDemoProductsAndOffers();
  await seedDemoOrders();
}

main()
  .then(async () => {
    console.log('Seed data created.');
    console.log(
      'Demo accounts: buyer@example.com / 12345678, manufacturer@example.com / 12345678, distributor@example.com / 12345678, admin@example.com / 12345678',
    );
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
