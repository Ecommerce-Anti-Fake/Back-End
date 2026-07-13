import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';

type OfferCreateData = {
  sellerUserId: string;
  shopId: string;
  categoryId: string;
  brandId: string;
  distributionNodeId: string | null;
  modelName: string;
  gtin: string | null;
  verificationPolicy: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  itemCondition: string;
  availableQuantity: number;
  offerStatus: string;
  parcelWeightGrams?: number | null;
  parcelLengthCm?: number | null;
  parcelWidthCm?: number | null;
  parcelHeightCm?: number | null;
};

type OfferOptionGroupCreateData = {
  displayName: string;
  values: Array<{
    text: string;
    mediaAssetId: string | null;
    sortOrder: number;
  }>;
};

type OfferImageCreateData = {
  fileUrl: string;
  mediaAssetId: string | null;
};

@Injectable()
export class OffersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAdminOffers(input: {
    offerStatus?: 'active' | 'inactive' | 'draft';
    moderationStatus?: 'pending' | 'approved' | 'rejected' | 'banned';
    page: number;
    pageSize: number;
  }) {
    const where: Prisma.OfferWhereInput = {
      ...(input.offerStatus ? { offerStatus: input.offerStatus } : {}),
      ...(input.moderationStatus
        ? { moderationStatus: input.moderationStatus }
        : {}),
    };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.offer.count({ where }),
      this.prisma.offer.findMany({
        where,
        select: {
          id: true,
          title: true,
          price: true,
          currency: true,
          offerStatus: true,
          moderationStatus: true,
          createdAt: true,
          shop: { select: { id: true, shopName: true } },
          category: { select: { id: true, name: true } },
          media: {
            orderBy: { createdAt: 'asc' },
            select: {
              mediaType: true,
              fileUrl: true,
              mediaAsset: { select: { secureUrl: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
    ]);

    return { total, items };
  }

  findBrandById(id: string) {
    return this.prisma.brand.findUnique({
      where: { id },
      select: {
        id: true,
      },
    });
  }

  findBrandByName(name: string) {
    return this.prisma.brand.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
      select: { id: true },
    });
  }

  createBrand(input: { name: string; registryStatus: string }) {
    return this.prisma.brand.create({
      data: input,
      select: { id: true },
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

  findShopByOwnerUserId(ownerUserId: string) {
    return this.prisma.shop.findFirst({
      where: { ownerUserId },
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

  findOwnedDistributionNode(
    nodeId: string,
    shopId: string,
    ownerUserId: string,
  ) {
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

  createOffer(data: OfferCreateData) {
    return this.prisma.offer.create({
      data,
      include: this.offerResponseInclude(),
    });
  }

  findOwnedMediaAssets(ids: string[], ownerUserId: string) {
    return this.prisma.mediaAsset.findMany({
      where: { id: { in: ids }, ownerUserId },
      select: { id: true },
    });
  }

  findMediaAssetById(id: string, ownerUserId?: string) {
    return this.prisma.mediaAsset.findFirst({
      where: { id, ...(ownerUserId ? { ownerUserId } : {}) },
      select: { id: true },
    });
  }

  findOwnedOfferOptionValues(
    offerId: string,
    sellerUserId: string,
    optionValueIds: string[],
  ) {
    return this.prisma.offer.findFirst({
      where: { id: offerId, sellerUserId },
      select: {
        id: true,
        optionGroups: {
          select: {
            id: true,
            values: {
              where: { id: { in: optionValueIds }, isVisible: true },
              select: { id: true },
            },
          },
        },
      },
    });
  }

  async findOfferVariantByOptionValueIds(
    offerId: string,
    optionValueIds: string[],
  ) {
    const variants = await this.prisma.offerVariant.findMany({
      where: {
        offerId,
        values: {
          every: { optionValueId: { in: optionValueIds } },
        },
      },
      select: {
        id: true,
        values: { select: { optionValueId: true } },
      },
    });
    return (
      variants.find(
        (variant) => variant.values.length === optionValueIds.length,
      ) ?? null
    );
  }

  createOfferVariant(input: {
    offerId: string;
    sku: string | null;
    price: number | null;
    availableQuantity: number;
    mediaAssetId: string | null;
    isActive: boolean;
    optionValueIds: string[];
  }) {
    return this.prisma.offerVariant.create({
      data: {
        offerId: input.offerId,
        sku: input.sku,
        price: input.price,
        availableQuantity: input.availableQuantity,
        mediaAssetId: input.mediaAssetId,
        isActive: input.isActive,
        values: {
          create: input.optionValueIds.map((optionValueId) => ({
            optionValueId,
          })),
        },
      },
      include: this.offerVariantResponseInclude(),
    });
  }

  async findOwnedOfferVariants(input: {
    offerId: string;
    sellerUserId: string;
    isActive?: boolean;
  }) {
    const offer = await this.prisma.offer.findFirst({
      where: { id: input.offerId, sellerUserId: input.sellerUserId },
      select: { id: true },
    });
    if (!offer) return null;
    return this.prisma.offerVariant.findMany({
      where: {
        offerId: input.offerId,
        ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
      },
      include: this.offerVariantResponseInclude(),
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateOwnedOfferVariant(input: {
    offerId: string;
    variantId: string;
    sellerUserId: string;
    data: {
      sku?: string | null;
      price?: number | null;
      availableQuantity?: number;
      mediaAssetId?: string | null;
      isActive?: boolean;
    };
  }) {
    const result = await this.prisma.offerVariant.updateMany({
      where: {
        id: input.variantId,
        offerId: input.offerId,
        offer: { sellerUserId: input.sellerUserId },
      },
      data: input.data,
    });
    if (result.count === 0) return null;
    return this.prisma.offerVariant.findUniqueOrThrow({
      where: { id: input.variantId },
      include: this.offerVariantResponseInclude(),
    });
  }

  findOfferOptionGroups(offerId: string) {
    return this.prisma.offerOptionGroup.findMany({
      where: { offerId },
      orderBy: { createdAt: 'asc' },
      select: {
        values: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          select: { id: true },
        },
      },
    });
  }

  async createMissingOfferVariants(offerId: string, combinations: string[][]) {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.offerVariant.findMany({
        where: { offerId },
        select: { values: { select: { optionValueId: true } } },
      });
      const keys = new Set(
        existing.map((variant) =>
          variant.values
            .map((value) => value.optionValueId)
            .sort()
            .join('|'),
        ),
      );
      for (const optionValueIds of combinations) {
        const key = [...optionValueIds].sort().join('|');
        if (keys.has(key)) continue;
        await tx.offerVariant.create({
          data: {
            offerId,
            sku: null,
            price: 0,
            availableQuantity: 0,
            mediaAssetId: null,
            isActive: true,
            values: {
              create: optionValueIds.map((optionValueId) => ({
                optionValueId,
              })),
            },
          },
        });
        keys.add(key);
      }
    });
  }

  createOfferWithSalesOptions(input: {
    offer: OfferCreateData;
    productImages: OfferImageCreateData[];
    optionGroups: OfferOptionGroupCreateData[];
  }) {
    return this.prisma.$transaction(async (tx) => {
      const offer = await tx.offer.create({ data: input.offer });

      for (const [index, image] of input.productImages.entries()) {
        await tx.offerMedia.create({
          data: {
            offerId: offer.id,
            mediaAssetId: image.mediaAssetId,
            mediaType: index === 0 ? 'thumbnail' : 'gallery',
            fileUrl: image.fileUrl,
            phash: null,
          },
        });
      }

      for (const group of input.optionGroups) {
        await tx.offerOptionGroup.create({
          data: {
            offerId: offer.id,
            displayName: group.displayName,
            values: { create: group.values },
          },
        });
      }

      return tx.offer.findUniqueOrThrow({
        where: { id: offer.id },
        include: this.offerResponseInclude(),
      });
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
      data,
      include: { mediaAsset: true },
    });
  }

  private offerResponseInclude() {
    return {
      shop: {
        select: { shopName: true, registrationType: true },
      },
      category: {
        select: { name: true },
      },
      brand: {
        select: { name: true },
      },
      distributionNode: {
        select: { networkId: true },
      },
      media: {
        orderBy: { createdAt: 'asc' as const },
        select: {
          mediaType: true,
          fileUrl: true,
          mediaAsset: {
            select: { secureUrl: true },
          },
        },
      },
      optionGroups: {
        orderBy: { createdAt: 'asc' as const },
        select: {
          id: true,
          displayName: true,
          values: {
            orderBy: [
              { sortOrder: 'asc' as const },
              { createdAt: 'asc' as const },
            ],
            select: {
              id: true,
              text: true,
              sortOrder: true,
              mediaAsset: { select: { id: true, secureUrl: true } },
            },
          },
        },
      },
      variants: {
        orderBy: { createdAt: 'asc' as const },
        select: this.offerDetailVariantSelect(),
      },
    };
  }

  private offerDetailVariantSelect() {
    return {
      id: true,
      sku: true,
      price: true,
      availableQuantity: true,
      isActive: true,
      values: {
        orderBy: { id: 'asc' as const },
        select: { optionValueId: true },
      },
      mediaAsset: {
        select: { id: true, secureUrl: true },
      },
    };
  }

  private offerVariantResponseInclude() {
    return {
      mediaAsset: { select: { id: true, secureUrl: true } },
      values: {
        select: {
          optionValue: {
            select: {
              id: true,
              text: true,
              sortOrder: true,
              optionGroup: {
                select: {
                  id: true,
                  displayName: true,
                },
              },
            },
          },
        },
      },
    };
  }

  getOfferWithRelations(offerId: string) {
    return this.prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        shop: {
          select: { shopName: true, registrationType: true },
        },
        category: {
          select: { name: true },
        },
        distributionNode: {
          select: { networkId: true },
        },
      },
    });
  }

  findAllOffers(
    input: {
      shopId?: string;
      sellerUserId?: string;
      includeInactive?: boolean;
      offerStatus?: 'active' | 'inactive' | 'draft';
      moderationStatus?: 'pending' | 'approved' | 'rejected' | 'banned';
      q?: string;
      categoryId?: string;
      brandId?: string;
      minPrice?: number;
      maxPrice?: number;
      location?: string;
      shopType?: 'NORMAL' | 'HANDMADE' | 'MANUFACTURER' | 'DISTRIBUTOR';
      sort?: 'featured' | 'newest' | 'price-asc' | 'price-desc';
      page?: number;
      pageSize?: number;
    } = {},
  ) {
    const q = input.q?.trim();
    const location = input.location?.trim();
    const shopWhere: Prisma.ShopWhereInput = {
      ...(input.sellerUserId ? { ownerUserId: input.sellerUserId } : {}),
      ...(input.shopType ? { registrationType: input.shopType } : {}),
    };
    const where: Prisma.OfferWhereInput = {
      ...(input.shopId ? { shopId: input.shopId } : {}),
      ...(Object.keys(shopWhere).length ? { shop: { is: shopWhere } } : {}),
      ...(input.offerStatus
        ? { offerStatus: input.offerStatus }
        : !input.includeInactive
          ? { offerStatus: 'active' }
          : {}),
      ...(input.moderationStatus
        ? { moderationStatus: input.moderationStatus }
        : !input.includeInactive
          ? { moderationStatus: 'approved' }
          : {}),
      ...(input.categoryId ? { categoryId: input.categoryId } : {}),
      ...(input.brandId ? { brandId: input.brandId } : {}),
      ...(input.minPrice !== undefined || input.maxPrice !== undefined
        ? {
            price: {
              ...(input.minPrice !== undefined ? { gte: input.minPrice } : {}),
              ...(input.maxPrice !== undefined ? { lte: input.maxPrice } : {}),
            },
          }
        : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
              {
                shop: {
                  is: { shopName: { contains: q, mode: 'insensitive' } },
                },
              },
              {
                category: {
                  is: { name: { contains: q, mode: 'insensitive' } },
                },
              },
              { modelName: { contains: q, mode: 'insensitive' } },
              { brand: { is: { name: { contains: q, mode: 'insensitive' } } } },
            ],
          }
        : {}),
      ...(location
        ? {
            batchLinks: {
              some: {
                batch: {
                  OR: [
                    {
                      countryOfOrigin: {
                        contains: location,
                        mode: 'insensitive',
                      },
                    },
                    { sourceName: { contains: location, mode: 'insensitive' } },
                  ],
                },
              },
            },
          }
        : {}),
    };
    const include = {
      shop: {
        select: { shopName: true, registrationType: true },
      },
      category: {
        select: { name: true },
      },
      distributionNode: {
        select: { networkId: true },
      },
      media: {
        orderBy: { createdAt: 'asc' as const },
        select: {
          mediaType: true,
          fileUrl: true,
          mediaAsset: {
            select: { secureUrl: true },
          },
        },
      },
    };
    const orderBy = this.resolveOfferSort(input.sort);

    if (input.page !== undefined || input.pageSize !== undefined) {
      const page = Math.max(1, input.page ?? 1);
      const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 20));

      return this.prisma
        .$transaction([
          this.prisma.offer.count({ where }),
          this.prisma.offer.findMany({
            where,
            include,
            orderBy,
            skip: (page - 1) * pageSize,
            take: pageSize,
          }),
        ])
        .then(([total, items]) => ({
          total,
          page,
          pageSize,
          items,
        }));
    }

    return this.prisma.offer.findMany({
      where,
      include,
      orderBy,
    });
  }

  private resolveOfferSort(
    sort?: 'featured' | 'newest' | 'price-asc' | 'price-desc',
  ): Prisma.OfferOrderByWithRelationInput {
    if (sort === 'price-asc') {
      return { price: 'asc' };
    }
    if (sort === 'price-desc') {
      return { price: 'desc' };
    }

    return { createdAt: 'desc' };
  }

  findOfferById(id: string) {
    return this.prisma.offer.findUnique({
      where: { id },
      include: {
        shop: {
          select: { shopName: true, registrationType: true },
        },
        category: {
          select: { name: true },
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
        optionGroups: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            displayName: true,
            values: {
              orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
              select: {
                id: true,
                text: true,
                sortOrder: true,
                mediaAsset: { select: { id: true, secureUrl: true } },
              },
            },
          },
        },
        variants: {
          orderBy: { createdAt: 'asc' },
          select: this.offerDetailVariantSelect(),
        },
      },
    });
  }

  findBuyNowOfferPreview(input: {
    offerId: string;
    variantId?: string | null;
  }) {
    return this.prisma.offer.findUnique({
      where: { id: input.offerId },
      select: {
        id: true,
        shopId: true,
        modelName: true,
        price: true,
        availableQuantity: true,
        offerStatus: true,
        moderationStatus: true,
        shop: {
          select: {
            id: true,
            shopName: true,
          },
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
        variants: {
          where: { id: input.variantId ?? '' },
          take: 1,
          select: {
            id: true,
            sku: true,
            price: true,
            availableQuantity: true,
            isActive: true,
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
            registrationType: true,
          },
        },
        distributionNode: {
          select: {
            id: true,
            relationshipStatus: true,
            shop: {
              select: {
                shopStatus: true,
              },
            },
          },
        },
        batchLinks: {
          select: {
            allocatedQuantity: true,
            batch: {
              select: {
                distributionNodeId: true,
                sourceType: true,
              },
            },
          },
        },
      },
    });
  }

  async moderateOffer(
    offerId: string,
    data: {
      moderationStatus: 'pending' | 'approved' | 'rejected' | 'banned';
      moderationReason: string | null;
    },
  ) {
    const result = await this.prisma.offer.updateMany({
      where: { id: offerId },
      data,
    });
    if (result.count === 0) {
      return null;
    }
    return this.findOfferById(offerId);
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
          select: { shopName: true, registrationType: true },
        },
        category: {
          select: { name: true },
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

  findAllocatableBatches(
    batchIds: string[],
    shopId: string,
    identity: {
      brandId: string;
      categoryId: string;
      modelName: string;
      gtin: string | null;
      verificationPolicy: string;
    },
  ) {
    return this.prisma.supplyBatch.findMany({
      where: {
        id: {
          in: batchIds,
        },
        shopId,
        brandId: identity.brandId,
        categoryId: identity.categoryId,
        modelName: identity.modelName,
        gtin: identity.gtin,
        verificationPolicy: identity.verificationPolicy,
      },
      select: {
        id: true,
        batchNumber: true,
        quantity: true,
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
    const totalAllocatedQuantity = input.items.reduce(
      (sum, item) => sum + item.allocatedQuantity,
      0,
    );
    const newAvailableQuantity = Math.max(
      totalAllocatedQuantity - input.soldQuantity,
      0,
    );

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
              quantity: true,
              sourceName: true,
              countryOfOrigin: true,
              sourceType: true,
              sourceOrderId: true,
              sourceOrderItemId: true,
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
            quantity: true,
            sourceName: true,
            countryOfOrigin: true,
            sourceType: true,
            sourceOrderId: true,
            sourceOrderItemId: true,
            receivedAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }
}
