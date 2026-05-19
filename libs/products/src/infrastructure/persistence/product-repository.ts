import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '@database/prisma/prisma.service';

@Injectable()
export class ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllBrands() {
    return this.prisma.brand.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  createBrand(data: {
    name: string;
    registryStatus: string;
  }) {
    return this.prisma.brand.create({
      data,
    });
  }

  findAllCategories() {
    return this.prisma.category.findMany({
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
    });
  }

  createCategory(data: {
    name: string;
    parentId: string | null;
    riskTier: string;
  }) {
    return this.prisma.category.create({
      data,
    });
  }

  findAllModels() {
    return this.prisma.productModel.findMany({
      include: {
        brand: {
          select: {
            name: true,
          },
        },
        category: {
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
        category: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  findBrandById(id: string) {
    return this.prisma.brand.findUnique({
      where: { id },
      select: {
        id: true,
      },
    });
  }

  createProductModel(data: {
    brandId: string;
    categoryId: string;
    modelName: string;
    gtin: string | null;
    verificationPolicy: string;
    approvalStatus: string;
  }) {
    return this.prisma.productModel.create({
      data,
      include: {
        brand: {
          select: {
            name: true,
          },
        },
        category: {
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
        registrationType: true,
      },
    });
  }

  findApprovedShopCategoryRegistration(shopId: string, categoryId: string) {
    return this.prisma.shopBusinessCategory.findFirst({
      where: {
        shopId,
        categoryId,
        registrationStatus: 'approved',
      },
      select: {
        id: true,
      },
    });
  }

  findOwnedDistributionNode(nodeId: string, shopId: string, ownerUserId: string) {
    return this.prisma.distributionNode.findFirst({
      where: {
        id: nodeId,
        shopId,
        shop: {
          ownerUserId,
        },
      },
      select: {
        id: true,
        relationshipStatus: true,
      },
    });
  }

  createOffer(data: {
    sellerUserId: string;
    shopId: string;
    categoryId: string;
    productModelId: string;
    distributionNodeId: string | null;
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
        distributionNode: {
          select: { networkId: true },
        },
      },
    });
  }

  findAllOffers(input: { shopId?: string; sellerUserId?: string; includeInactive?: boolean } = {}) {
    return this.prisma.offer.findMany({
      where: {
        ...(input.shopId ? { shopId: input.shopId } : {}),
        ...(input.sellerUserId ? { shop: { ownerUserId: input.sellerUserId } } : {}),
        ...(!input.includeInactive ? { offerStatus: 'active' } : {}),
      },
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
        distributionNode: {
          select: { networkId: true },
        },
        media: {
          orderBy: { createdAt: 'asc' },
          select: {
            mediaType: true,
            fileUrl: true,
            mediaAsset: {
              select: { secureUrl: true },
            },
          },
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
        distributionNode: {
          select: { networkId: true },
        },
        media: {
          orderBy: { createdAt: 'asc' },
          select: {
            mediaType: true,
            fileUrl: true,
            mediaAsset: {
              select: { secureUrl: true },
            },
          },
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
        batchLinks: {
          select: {
            allocatedQuantity: true,
          },
        },
      },
    });
  }

  updateOwnedOffer(
    offerId: string,
    sellerUserId: string,
    data: {
      title?: string;
      description?: string;
      price?: number;
      availableQuantity?: number;
      offerStatus?: string;
    },
  ) {
    return this.prisma.offer.update({
      where: {
        id: offerId,
        sellerUserId,
      },
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
        media: {
          orderBy: { createdAt: 'asc' },
          select: {
            mediaType: true,
            fileUrl: true,
            mediaAsset: {
              select: { secureUrl: true },
            },
          },
        },
      },
    });
  }

  findAllocatableBatches(batchIds: string[], shopId: string, productModelId: string) {
    return this.prisma.supplyBatch.findMany({
      where: {
        id: {
          in: batchIds,
        },
        shopId,
        productModelId,
      },
      select: {
        id: true,
        batchNumber: true,
        quantity: true,
        productModelId: true,
        distributionNodeId: true,
        offerLinks: {
          select: {
            offerId: true,
            allocatedQuantity: true,
          },
        },
      },
    });
  }

  async replaceOfferBatchLinks(input: {
    offerId: string;
    soldQuantity: number;
    items: Array<{
      batchId: string;
      allocatedQuantity: number;
    }>;
  }) {
    const totalAllocatedQuantity = input.items.reduce((sum, item) => sum + item.allocatedQuantity, 0);
    const newAvailableQuantity = Math.max(totalAllocatedQuantity - input.soldQuantity, 0);

    return this.prisma.$transaction(async (tx) => {
      await tx.offerBatchLink.deleteMany({
        where: {
          offerId: input.offerId,
        },
      });

      if (input.items.length > 0) {
        await tx.offerBatchLink.createMany({
          data: input.items.map((item) => ({
            offerId: input.offerId,
            batchId: item.batchId,
            allocatedQuantity: item.allocatedQuantity,
          })),
        });
      }

      await tx.offer.update({
        where: {
          id: input.offerId,
        },
        data: {
          availableQuantity: newAvailableQuantity,
        },
      });

      return tx.offerBatchLink.findMany({
        where: {
          offerId: input.offerId,
        },
        include: {
          batch: {
            select: {
              batchNumber: true,
              productModelId: true,
              quantity: true,
              sourceName: true,
              countryOfOrigin: true,
              sourceType: true,
              receivedAt: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
    });
  }

  findOfferBatchLinks(offerId: string) {
    return this.prisma.offerBatchLink.findMany({
      where: {
        offerId,
      },
      include: {
        batch: {
          select: {
            batchNumber: true,
            productModelId: true,
            quantity: true,
            sourceName: true,
            countryOfOrigin: true,
            sourceType: true,
            receivedAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
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

  findOwnedOfferMedia(offerId: string, mediaId: string, sellerUserId: string) {
    return this.prisma.offerMedia.findFirst({
      where: {
        id: mediaId,
        offerId,
        offer: {
          sellerUserId,
        },
      },
    });
  }

  deleteOfferMedia(mediaId: string) {
    return this.prisma.offerMedia.delete({
      where: {
        id: mediaId,
      },
    });
  }

  setOfferPrimaryMedia(offerId: string, mediaId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.offerMedia.updateMany({
        where: {
          offerId,
          mediaType: 'thumbnail',
          id: { not: mediaId },
        },
        data: {
          mediaType: 'gallery',
        },
      });

      return tx.offerMedia.update({
        where: {
          id: mediaId,
        },
        data: {
          mediaType: 'thumbnail',
        },
        include: {
          mediaAsset: true,
        },
      });
    });
  }

  findOfferReviews(offerId: string) {
    return this.prisma.review.findMany({
      where: {
        OR: [
          {
            orderItem: {
              offerId,
            },
          },
          {
            orderItemId: null,
            order: {
              items: {
                some: {
                  offerId,
                },
              },
            },
          },
        ],
      },
      include: {
        orderItem: {
          select: {
            offerId: true,
          },
        },
        fromUser: {
          select: {
            displayName: true,
            email: true,
            phone: true,
          },
        },
        media: {
          include: {
            mediaAsset: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  findLatestCompletedOrderItemForOffer(offerId: string, buyerUserId: string) {
    return this.prisma.orderItem.findFirst({
      where: {
        offerId,
        order: {
          buyerUserId,
          OR: [{ orderStatus: 'completed' }, { fulfillmentStatus: 'DELIVERED' }],
        },
      },
      include: {
        order: {
          include: {
            shop: {
              select: {
                ownerUserId: true,
              },
            },
          },
        },
        reviews: {
          where: {
            fromUserId: buyerUserId,
          },
          include: {
            media: {
              include: {
                mediaAsset: true,
              },
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        order: {
          createdAt: 'desc',
        },
      },
    });
  }

  findCompletedOrderItemForReview(orderItemId: string, buyerUserId: string) {
    return this.prisma.orderItem.findFirst({
      where: {
        id: orderItemId,
        order: {
          buyerUserId,
          OR: [{ orderStatus: 'completed' }, { fulfillmentStatus: 'DELIVERED' }],
        },
      },
      include: {
        order: {
          include: {
            shop: {
              select: {
                ownerUserId: true,
              },
            },
          },
        },
        reviews: {
          where: {
            fromUserId: buyerUserId,
          },
          include: {
            media: {
              include: {
                mediaAsset: true,
              },
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });
  }

  createReview(data: {
    orderId: string;
    orderItemId: string;
    fromUserId: string;
    toUserId: string;
    rating: number;
    comment: string | null;
  }) {
    return this.prisma.review.create({
      data,
      include: {
        orderItem: {
          select: {
            offerId: true,
          },
        },
        fromUser: {
          select: {
            displayName: true,
            email: true,
            phone: true,
          },
        },
        media: {
          include: {
            mediaAsset: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });
  }

  updateReview(reviewId: string, data: { rating: number; comment: string | null }) {
    return this.prisma.review.update({
      where: {
        id: reviewId,
      },
      data,
      include: {
        orderItem: {
          select: {
            offerId: true,
          },
        },
        fromUser: {
          select: {
            displayName: true,
            email: true,
            phone: true,
          },
        },
        media: {
          include: {
            mediaAsset: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });
  }

  findReviewOwnedByBuyer(reviewId: string, buyerUserId: string) {
    return this.prisma.review.findFirst({
      where: {
        id: reviewId,
        fromUserId: buyerUserId,
      },
      include: {
        media: {
          include: {
            mediaAsset: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });
  }

  createReviewMedia(data: {
    reviewId: string;
    mediaAssetId: string | null;
    fileUrl: string;
    mimeType: string | null;
    publicId: string | null;
  }) {
    return this.prisma.reviewMedia.create({
      data,
      include: {
        mediaAsset: true,
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

  findOwnedOfferDocument(offerId: string, documentId: string, sellerUserId: string) {
    return this.prisma.offerDocument.findFirst({
      where: {
        id: documentId,
        offerId,
        offer: {
          sellerUserId,
        },
      },
    });
  }

  deleteOfferDocument(documentId: string) {
    return this.prisma.offerDocument.delete({
      where: {
        id: documentId,
      },
    });
  }

  private hashValue(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }
}
