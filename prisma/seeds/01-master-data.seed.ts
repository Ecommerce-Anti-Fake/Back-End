import { PrismaClient } from '@prisma/client';
import { COUNTS, id, imageUrl, SeedContext } from './00-utils';

const categoryNames = [
  ['Danh muc Demo UAT 01', 'medium'],
  ['Danh muc Demo UAT 02', 'medium'],
  ['Danh muc Demo UAT 03', 'high'],
  ['Danh muc Demo UAT 04', 'high'],
  ['Danh muc Demo UAT 05', 'high'],
  ['Danh muc Demo UAT 06', 'low'],
  ['Danh muc Demo UAT 07', 'low'],
  ['Danh muc Demo UAT 08', 'medium'],
  ['Danh muc Demo UAT 09', 'medium'],
  ['Danh muc Demo UAT 10', 'low'],
  ['Danh muc Demo UAT 11', 'low'],
  ['Danh muc Demo UAT 12', 'low'],
  ['Danh muc Demo UAT 13', 'medium'],
  ['Danh muc Demo UAT 14', 'medium'],
  ['Danh muc Demo UAT 15', 'low'],
] as const;

const brandNames = [
  'Thuong hieu Demo UAT 01',
  'Thuong hieu Demo UAT 02',
  'Thuong hieu Demo UAT 03',
  'Thuong hieu Demo UAT 04',
  'Thuong hieu Demo UAT 05',
  'Thuong hieu Demo UAT 06',
  'Thuong hieu Demo UAT 07',
  'Thuong hieu Demo UAT 08',
  'Thuong hieu Demo UAT 09',
  'Thuong hieu Demo UAT 10',
  'Thuong hieu Demo UAT 11',
  'Thuong hieu Demo UAT 12',
  'Thuong hieu Demo UAT 13',
  'Thuong hieu Demo UAT 14',
  'Thuong hieu Demo UAT 15',
];

export async function seedMasterData(prisma: PrismaClient, ctx: SeedContext) {
  const shopTypes = [
    ['NORMAL', 'Shop thuong', 'Ban le thong thuong tren san.', 10],
    [
      'HANDMADE',
      'Shop thu cong',
      'Ban san pham tu lam hoac san pham thu cong.',
      20,
    ],
    [
      'MANUFACTURER',
      'Nha san xuat',
      'San xuat, ban si/le va mo kenh phan phoi.',
      30,
    ],
    [
      'DISTRIBUTOR',
      'Dai ly phan phoi',
      'Mua si, phan phoi hoac ban lai hang hoa.',
      40,
    ],
  ] as const;

  for (const [code, name, description, sortOrder] of shopTypes) {
    const item = await prisma.shopType.create({
      data: { id: id(), code, name, description, sortOrder, isActive: true },
    });
    ctx.shopTypes[code] = item;
  }

  const requirements = [
    [
      'BUSINESS_LICENSE',
      'Giay phep kinh doanh',
      'Tai lieu kiem thu cho ho so shop.',
    ],
    [
      'TAX_REGISTRATION',
      'Dang ky thue',
      'Tai lieu kiem thu cho thong tin thue.',
    ],
    [
      'MANUFACTURING_CERTIFICATE',
      'Chung minh co so san xuat',
      'Tai lieu kiem thu cho co so san xuat.',
    ],
    [
      'DISTRIBUTION_LICENSE',
      'Giay phep phan phoi',
      'Tai lieu kiem thu cho quyen phan phoi.',
    ],
    [
      'HANDMADE_PROOF',
      'Bang chung san pham thu cong',
      'Tai lieu kiem thu cho san pham thu cong.',
    ],
  ] as const;

  for (const [code, name, description] of requirements) {
    const item = await prisma.verificationRequirement.create({
      data: {
        id: id(),
        code,
        name,
        description,
        multipleFilesAllowed: true,
        isActive: true,
      },
    });
    ctx.requirements[code] = item;
  }

  const mappings = [
    ['NORMAL', 'BUSINESS_LICENSE', true, 10],
    ['HANDMADE', 'BUSINESS_LICENSE', true, 10],
    ['HANDMADE', 'HANDMADE_PROOF', true, 20],
    ['MANUFACTURER', 'BUSINESS_LICENSE', true, 10],
    ['MANUFACTURER', 'TAX_REGISTRATION', true, 20],
    ['MANUFACTURER', 'MANUFACTURING_CERTIFICATE', true, 30],
    ['DISTRIBUTOR', 'BUSINESS_LICENSE', true, 10],
    ['DISTRIBUTOR', 'TAX_REGISTRATION', false, 20],
    ['DISTRIBUTOR', 'DISTRIBUTION_LICENSE', true, 30],
  ] as const;

  for (const [shopTypeCode, requirementCode, required, sortOrder] of mappings) {
    await prisma.shopTypeRequirement.create({
      data: {
        id: id(),
        shopTypeId: ctx.shopTypes[shopTypeCode].id,
        requirementId: ctx.requirements[requirementCode].id,
        required,
        sortOrder,
        isActive: true,
      },
    });
  }

  const carriers = [
    [
      'SELF_DELIVERY',
      'Tu van chuyen',
      'Seller tu giao hoac tu sap xep van chuyen.',
      0,
    ],
    ['GHN', 'Giao Hang Nhanh', 'Carrier tich hop qua API GHN.', 10],
    ['GHTK', 'Giao Hang Tiet Kiem', 'Carrier mo phong chua bat trong UAT.', 20],
    [
      'VIETTEL_POST',
      'Viettel Post',
      'Carrier mo phong chua bat trong UAT.',
      30,
    ],
    ['JNT', 'J&T Express', 'Carrier mo phong chua bat trong UAT.', 40],
  ] as const;

  for (const [code, name, description, sortOrder] of carriers) {
    ctx.carriers.push(
      await prisma.shippingCarrier.create({
        data: {
          id: id(),
          code,
          name,
          description,
          isActive: code === 'GHN',
          sortOrder,
        },
      }),
    );
  }

  for (let i = 0; i < COUNTS.categories; i += 1) {
    const [name, riskTier] = categoryNames[i];
    ctx.categories.push(
      await prisma.category.create({
        data: {
          id: id(),
          name,
          riskTier,
          imageUrl: imageUrl(`uat-category-${i + 1}`, 640, 640),
        },
      }),
    );
  }

  for (let i = 0; i < COUNTS.brands; i += 1) {
    ctx.brands.push(
      await prisma.brand.create({
        data: {
          id: id(),
          name: brandNames[i],
          registryStatus: i === 0 ? 'reviewing' : 'approved',
        },
      }),
    );
  }
}
