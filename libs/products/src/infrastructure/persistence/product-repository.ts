import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '@database/prisma/prisma.service';

@Injectable()
export class ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllModels() {
    return this.prisma.productModel.findMany({
      include: {
        brand: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findModelById(id: string) {
    return this.prisma.productModel.findUnique({
      where: { id },
      include: {
        brand: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  findCategoryById(id: string) {
    return this.prisma.category.findUnique({
      where: { id },
      select: { id: true },
    });
  }

  findOwnedShop(shopId: string, ownerUserId: string) {
    return this.prisma.shop.findFirst({
      where: {
        id: shopId,
        ownerUserId,
      },
      select: {
        id: true,
        shopStatus: true,
      },
    });
  }

  createOffer(data: {
    sellerUserId: string;
    shopId: string;
    categoryId: string;
    productModelId: string;
    title: string;
    description: string;
    price: number;
    currency: string;
    salesMode: 'RETAIL' | 'WHOLESALE' | 'BOTH';
    minWholesaleQty: number | null;
    itemCondition: string;
    availableQuantity: number;
    verificationLevel: string;
    offerStatus: string;
  }) {
    return this.prisma.offer.create({
      data,
      include: {
        shop: {
          select: { shopName: true },
        },
        category: {
          select: { name: true },
        },
        productModel: {
          select: { modelName: true },
        },
      },
    });
  }

  findAllOffers(shopId?: string) {
    return this.prisma.offer.findMany({
      where: shopId ? { shopId } : undefined,
      include: {
        shop: {
          select: { shopName: true },
        },
        category: {
          select: { name: true },
        },
        productModel: {
          select: { modelName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOfferById(id: string) {
    return this.prisma.offer.findUnique({
      where: { id },
      include: {
        shop: {
          select: { shopName: true },
        },
        category: {
          select: { name: true },
        },
        productModel: {
          select: { modelName: true },
        },
      },
    });
  }

  findOwnedOffer(offerId: string, sellerUserId: string) {
    return this.prisma.offer.findFirst({
      where: {
        id: offerId,
        sellerUserId,
      },
      include: {
        shop: {
          select: {
            id: true,
            shopStatus: true,
          },
        },
      },
    });
  }

  createOfferMedia(data: {
    offerId: string;
    mediaAssetId: string | null;
    mediaType: string;
    fileUrl: string;
    phash: string | null;
  }) {
    return this.prisma.offerMedia.create({
      data: {
        offerId: data.offerId,
        mediaAssetId: data.mediaAssetId,
        mediaType: data.mediaType,
        fileUrl: data.fileUrl,
        phash: data.phash,
      },
      include: {
        mediaAsset: true,
      },
    });
  }

  findOfferMedia(offerId: string) {
    return this.prisma.offerMedia.findMany({
      where: { offerId },
      include: {
        mediaAsset: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  createOfferDocument(data: {
    offerId: string;
    mediaAssetId: string | null;
    docType: string;
    fileUrl: string;
    issuerName: string | null;
    documentNumber: string | null;
  }) {
    return this.prisma.offerDocument.create({
      data: {
        offerId: data.offerId,
        mediaAssetId: data.mediaAssetId,
        docType: data.docType,
        fileUrl: data.fileUrl,
        issuerName: data.issuerName,
        documentNumberHash: data.documentNumber ? this.hashValue(data.documentNumber) : null,
        reviewStatus: 'pending',
      },
      include: {
        mediaAsset: true,
      },
    });
  }

  findOfferDocuments(offerId: string) {
    return this.prisma.offerDocument.findMany({
      where: { offerId },
      include: {
        mediaAsset: true,
      },
      orderBy: {
        uploadedAt: 'asc',
      },
    });
  }

  private hashValue(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }
}
