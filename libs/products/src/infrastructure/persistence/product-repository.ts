import { Injectable } from '@nestjs/common';
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
}
