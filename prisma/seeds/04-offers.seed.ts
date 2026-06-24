import { PrismaClient, OfferSalesMode } from '@prisma/client';
import { COUNTS, createMediaAsset, documentUrl, gtin, id, imageUrl, money, pick, recentDate, SeedContext } from './00-utils';

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
    const shop = i % 4 === 0 ? pick(ctx.distributorShops, i) : pick(ctx.manufacturerShops.length ? ctx.manufacturerShops : ctx.shops, i);
    const seller = ctx.users.find((user) => user.id === shop.ownerUserId) ?? pick(ctx.users, i);
    const template = productTemplates[i % productTemplates.length];
    const isWholesale = i % 4 === 1;
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
        description: `Sản phẩm ${title.toLowerCase()} từ ${brand.name}, có hồ sơ nguồn gốc và thông tin lô để phục vụ xác thực AntiFake.`,
        price: money(price),
        currency: 'VND',
        salesMode: isWholesale ? OfferSalesMode.WHOLESALE : i % 6 === 0 ? OfferSalesMode.BOTH : OfferSalesMode.RETAIL,
        minWholesaleQty: isWholesale ? 3 + (i % 5) : null,
        itemCondition: 'new',
        availableQuantity: 50 + (i * 7) % 450,
        verificationLevel: i % 8 === 0 ? 'standard' : 'verified',
        offerStatus: i % 17 === 0 ? 'draft' : 'active',
        parcelWeightGrams: 300 + (i % 10) * 150,
        parcelLengthCm: 10 + (i % 6) * 3,
        parcelWidthCm: 8 + (i % 5) * 2,
        parcelHeightCm: 6 + (i % 4) * 2,
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
          issuerName: i % 2 === 0 ? 'Trung tâm kiểm định chất lượng' : 'Nhà sản xuất',
          documentNumberHash: `doc-hash-${i}`,
          reviewStatus: i % 7 === 0 ? 'pending' : 'approved',
          uploadedAt: recentDate(45 - (i % 30)),
        },
      });
    }
  }

  for (let i = 0; i < COUNTS.offerShippingMethods; i += 1) {
    const offer = pick(ctx.offers, i);
    const carrier = pick(ctx.carriers, i);
    await prisma.offerShippingMethod.upsert({
      where: { offerId_providerCode: { offerId: offer.id, providerCode: carrier.code } },
      update: {},
      create: {
        id: id(),
        offerId: offer.id,
        carrierId: carrier.id,
        providerCode: carrier.code,
        providerName: carrier.name,
        shippingFee: money(carrier.code === 'SELF_DELIVERY' ? 0 : 18000 + (i % 5) * 5000),
        estimatedDays: carrier.code === 'SELF_DELIVERY' ? '1-2 ngày' : `${2 + (i % 3)}-${4 + (i % 3)} ngày`,
        isEnabled: true,
      },
    });
  }
}
