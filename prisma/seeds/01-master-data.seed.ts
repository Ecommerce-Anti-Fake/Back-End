import { PrismaClient } from '@prisma/client';
import { COUNTS, id, SeedContext } from './00-utils';

const categoryNames = [
  ['Thực phẩm', 'medium'],
  ['Đồ uống', 'medium'],
  ['Mỹ phẩm', 'high'],
  ['Chăm sóc cá nhân', 'high'],
  ['Thực phẩm chức năng', 'high'],
  ['Mẹ và bé', 'high'],
  ['Đồ gia dụng', 'low'],
  ['Điện tử', 'medium'],
  ['Điện gia dụng', 'medium'],
  ['Thời trang nam', 'low'],
  ['Thời trang nữ', 'low'],
  ['Phụ kiện', 'low'],
  ['Nông sản', 'medium'],
  ['Thú cưng', 'medium'],
  ['Sách & Văn phòng phẩm', 'low'],
] as const;

const brandNames = [
  'Vinamilk',
  'TH True Milk',
  'Nutifood',
  'Masan',
  'Acecook',
  'Cocoon',
  'Thorakao',
  'Lix',
  'Sunhouse',
  'LocknLock',
  "Biti's",
  'Canifa',
  'Trung Nguyên',
  'Lavie',
  'An Phước',
];

export async function seedMasterData(prisma: PrismaClient, ctx: SeedContext) {
  const shopTypes = [
    ['NORMAL', 'Shop thường', 'Bán lẻ thông thường trên sàn.', 10],
    ['HANDMADE', 'Shop thủ công', 'Bán sản phẩm tự làm hoặc sản phẩm thủ công.', 20],
    ['MANUFACTURER', 'Nhà sản xuất', 'Sản xuất, bán sỉ/lẻ và có thể mở kênh phân phối.', 30],
    ['DISTRIBUTOR', 'Đại lý phân phối', 'Mua sỉ, phân phối hoặc bán lại hàng hóa được ủy quyền.', 40],
  ] as const;

  for (const [code, name, description, sortOrder] of shopTypes) {
    const item = await prisma.shopType.create({
      data: { id: id(), code, name, description, sortOrder, isActive: true },
    });
    ctx.shopTypes[code] = item;
  }

  const requirements = [
    ['BUSINESS_LICENSE', 'Giấy phép kinh doanh', 'Ảnh hoặc bản scan giấy phép kinh doanh/hộ kinh doanh còn hiệu lực.'],
    ['TAX_REGISTRATION', 'Giấy đăng ký thuế', 'Tài liệu chứng minh mã số thuế hoặc thông tin đăng ký thuế.'],
    ['MANUFACTURING_CERTIFICATE', 'Giấy chứng minh cơ sở sản xuất', 'Giấy chứng nhận đủ điều kiện sản xuất, ảnh cơ sở hoặc tài liệu tương đương.'],
    ['DISTRIBUTION_LICENSE', 'Giấy phép phân phối', 'Giấy ủy quyền, hợp đồng phân phối hoặc tài liệu chứng minh quyền phân phối.'],
    ['HANDMADE_PROOF', 'Bằng chứng sản phẩm thủ công', 'Ảnh quy trình sản xuất, cam kết sản phẩm thủ công hoặc tài liệu liên quan.'],
  ] as const;

  for (const [code, name, description] of requirements) {
    const item = await prisma.verificationRequirement.create({
      data: { id: id(), code, name, description, multipleFilesAllowed: true, isActive: true },
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
    ['SELF_DELIVERY', 'Tự vận chuyển', 'Seller tự giao hoặc tự sắp xếp vận chuyển.', 0],
    ['GHN', 'Giao Hàng Nhanh', 'Carrier tích hợp dự kiến qua API GHN.', 10],
    ['GHTK', 'Giao Hàng Tiết Kiệm', 'Carrier tích hợp dự kiến qua API GHTK.', 20],
    ['VIETTEL_POST', 'Viettel Post', 'Carrier tích hợp dự kiến qua API Viettel Post.', 30],
    ['JNT', 'J&T Express', 'Carrier tích hợp dự kiến qua API J&T Express.', 40],
  ] as const;

  for (const [code, name, description, sortOrder] of carriers) {
    ctx.carriers.push(
      await prisma.shippingCarrier.create({
        data: { id: id(), code, name, description, isActive: code === 'GHN', sortOrder },
      }),
    );
  }

  for (let i = 0; i < COUNTS.categories; i += 1) {
    const [name, riskTier] = categoryNames[i];
    ctx.categories.push(await prisma.category.create({ data: { id: id(), name, riskTier } }));
  }

  for (let i = 0; i < COUNTS.brands; i += 1) {
    ctx.brands.push(
      await prisma.brand.create({
        data: { id: id(), name: brandNames[i], registryStatus: i % 7 === 0 ? 'reviewing' : 'approved' },
      }),
    );
  }
}
