import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma/prisma.service';
import { Prisma, ShopRegistrationType } from '@prisma/client';
import { randomUUID } from 'crypto';

type AuditLogRecord = {
  id: string;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  note: string | null;
  actorUserId: string;
  createdAt: Date;
  actor: {
    id: string;
    displayName: string | null;
    email: string | null;
  };
};

const shopWithRelationsArgs = Prisma.validator<Prisma.ShopDefaultArgs>()({
  include: {
    registeredCategories: {
      include: {
        category: {
          select: {
            id: true,
            name: true,
            riskTier: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    },
    documents: {
      include: {
        files: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    },
    owner: {
      select: {
        kyc: {
          include: {
            documents: true,
          },
        },
      },
    },
  },
});

const shopVerificationSummaryArgs = Prisma.validator<Prisma.ShopDefaultArgs>()({
  include: {
    documents: {
      include: {
        files: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
      orderBy: {
        uploadedAt: 'asc',
      },
    },
    registeredCategories: {
      include: {
        category: {
          select: {
            id: true,
            name: true,
            riskTier: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    },
    owner: {
      select: {
        kyc: {
          select: {
            verificationStatus: true,
            documents: {
              select: {
                side: true,
              },
            },
          },
        },
      },
    },
  },
});

const adminShopVerificationDetailArgs = Prisma.validator<Prisma.ShopDefaultArgs>()({
  include: {
    shopType: {
      include: {
        requirements: {
          where: {
            isActive: true,
            requirement: {
              isActive: true,
            },
          },
          include: {
            requirement: true,
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    },
    owner: {
      select: {
        id: true,
        displayName: true,
        email: true,
        phone: true,
        kyc: {
          include: {
            documents: {
              include: {
                mediaAsset: true,
              },
              orderBy: {
                uploadedAt: 'asc',
              },
            },
          },
        },
      },
    },
    documents: {
      include: {
        files: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
      orderBy: {
        uploadedAt: 'asc',
      },
    },
    registeredCategories: {
      include: {
        category: {
          select: {
            id: true,
            name: true,
            riskTier: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    },
  },
});

@Injectable()
export class ShopsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    ownerUserId: string;
    shopTypeId?: string | null;
    shopName: string;
    registrationType: 'NORMAL' | 'HANDMADE' | 'MANUFACTURER' | 'DISTRIBUTOR';
    businessType: string;
    taxCode: string | null;
    warehouseAddress?: string | null;
    warehouseProvinceCode?: string | null;
    warehouseProvinceName?: string | null;
    warehouseWardCode?: string | null;
    warehouseWardName?: string | null;
    shopStatus: string;
    categoryRegistrations: Array<{
      categoryId: string;
      registrationStatus: string;
      approvedAt: Date | null;
    }>;
  }) {
    return this.prisma.shop.create({
      data: {
        ownerUserId: data.ownerUserId,
        shopTypeId: data.shopTypeId ?? undefined,
        shopName: data.shopName,
        registrationType: data.registrationType,
        businessType: data.businessType,
        taxCode: data.taxCode,
        warehouseAddress: data.warehouseAddress ?? null,
        warehouseProvinceCode: data.warehouseProvinceCode ?? null,
        warehouseProvinceName: data.warehouseProvinceName ?? null,
        warehouseWardCode: data.warehouseWardCode ?? null,
        warehouseWardName: data.warehouseWardName ?? null,
        shopStatus: data.shopStatus,
        registeredCategories: {
          create: data.categoryRegistrations,
        },
      },
      include: {
        registeredCategories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });
  }

  findActiveShopTypeByCode(code: string) {
    return this.prisma.shopType.findFirst({
      where: {
        code,
        isActive: true,
      },
      select: {
        id: true,
        code: true,
      },
    });
  }

  findRequirementForShopType(input: { shopTypeId?: string | null; requirementCode: string }) {
    if (!input.shopTypeId) {
      return null;
    }

    return this.prisma.shopTypeRequirement.findFirst({
      where: {
        shopTypeId: input.shopTypeId,
        isActive: true,
        requirement: {
          code: input.requirementCode,
          isActive: true,
        },
      },
      select: {
        requirement: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });
  }

  async findDocumentRequirementsForShop(shopId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        id: true,
        shopTypeId: true,
        registrationType: true,
      },
    });

    if (!shop) {
      return null;
    }

    const shopType =
      shop.shopTypeId !== null
        ? await this.prisma.shopType.findUnique({
            where: { id: shop.shopTypeId },
            include: {
              requirements: {
                where: {
                  isActive: true,
                  requirement: {
                    isActive: true,
                  },
                },
                include: {
                  requirement: true,
                },
                orderBy: {
                  sortOrder: 'asc',
                },
              },
            },
          })
        : await this.prisma.shopType.findUnique({
            where: { code: shop.registrationType },
            include: {
              requirements: {
                where: {
                  isActive: true,
                  requirement: {
                    isActive: true,
                  },
                },
                include: {
                  requirement: true,
                },
                orderBy: {
                  sortOrder: 'asc',
                },
              },
            },
          });

    return shopType;
  }

  findById(id: string) {
    return this.prisma.shop.findUnique({
      where: { id },
      include: {
        registeredCategories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });
  }

  async findPublicShopDetailById(id: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id },
      select: {
        id: true,
        shopName: true,
        shopStatus: true,
        createdAt: true,
        avatarMedia: {
          select: {
            secureUrl: true,
          },
        },
        bannerMedia: {
          select: {
            secureUrl: true,
          },
        },
        _count: {
          select: {
            offers: true,
          },
        },
      },
    });

    return shop ? this.toPublicShopSummary(shop) : null;
  }

  findByOwnerUserId(ownerUserId: string) {
    return this.prisma.shop.findMany({
      where: { ownerUserId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPublicShopSummaries(input: { page?: number; pageSize?: number } = {}) {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 20));
    const where = { shopStatus: 'verified' };
    const [total, shops] = await this.prisma.$transaction([
      this.prisma.shop.count({ where }),
      this.prisma.shop.findMany({
        where,
        select: {
          id: true,
          shopName: true,
          shopStatus: true,
          createdAt: true,
          avatarMedia: {
            select: {
              secureUrl: true,
            },
          },
          bannerMedia: {
            select: {
              secureUrl: true,
            },
          },
          _count: {
            select: {
              offers: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const items = await Promise.all(shops.map((shop) => this.toPublicShopSummary(shop)));

    return {
      total,
      page,
      pageSize,
      items,
    };
  }

  async findPublicShopSummaryByOfferId(offerId: string) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      select: {
        shop: {
          select: {
            id: true,
            shopName: true,
            shopStatus: true,
            createdAt: true,
            avatarMedia: {
              select: {
                secureUrl: true,
              },
            },
            bannerMedia: {
              select: {
                secureUrl: true,
              },
            },
            _count: {
              select: {
                offers: true,
              },
            },
          },
        },
      },
    });

    return offer?.shop ? this.toPublicShopSummary(offer.shop) : null;
  }

  async findPublicShopCategoriesByShopId(shopId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        id: true,
        shopStatus: true,
        registeredCategories: {
          where: { registrationStatus: 'approved' },
          select: {
            category: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!shop || shop.shopStatus !== 'verified') {
      return null;
    }

    return shop.registeredCategories.map((item) => ({
      categoryId: item.category.id,
      categoryName: item.category.name,
      imageUrl: item.category.imageUrl,
    }));
  }

  private async toPublicShopSummary(shop: {
    id: string;
    shopName: string;
    shopStatus: string;
    createdAt: Date;
    avatarMedia?: { secureUrl: string } | null;
    bannerMedia?: { secureUrl: string } | null;
    _count?: { offers: number };
  }) {
    const [reviewStats, saleStats] = await Promise.all([
      this.prisma.review.aggregate({
        where: {
          order: {
            shopId: shop.id,
          },
        },
        _avg: {
          rating: true,
        },
        _count: {
          _all: true,
        },
      }),
      this.prisma.orderItem.aggregate({
        where: {
          order: {
            shopId: shop.id,
            OR: [{ orderStatus: 'completed' }, { fulfillmentStatus: 'DELIVERED' }],
          },
        },
        _sum: {
          quantity: true,
        },
      }),
    ]);

    return {
      shopId: shop.id,
      shopName: shop.shopName,
      shopAvatar: shop.avatarMedia?.secureUrl ?? '',
      shopBanner: shop.bannerMedia?.secureUrl ?? '',
      rating: Number((reviewStats._avg.rating ?? 0).toFixed(1)),
      totalOffer: shop._count?.offers ?? 0,
      totalSale: saleStats._sum.quantity ?? 0,
      totalReview: reviewStats._count._all,
      createdAt: shop.createdAt.toISOString(),
      verify: shop.shopStatus === 'verified',
    };
  }

  updateProfile(
    shopId: string,
    data: {
      shopName?: string;
      businessType?: string;
      taxCode?: string | null;
      warehouseAddress?: string | null;
      warehouseProvinceCode?: string | null;
      warehouseProvinceName?: string | null;
      warehouseWardCode?: string | null;
      warehouseWardName?: string | null;
    },
  ) {
    return this.prisma.shop.update({
      where: { id: shopId },
      data,
      include: {
        registeredCategories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });
  }

  updateRegistrationType(
    shopId: string,
    data: {
      registrationType: 'NORMAL' | 'HANDMADE' | 'MANUFACTURER' | 'DISTRIBUTOR';
      shopTypeId: string | null;
    },
  ) {
    return this.prisma.shop.update({
      where: { id: shopId },
      data: {
        registrationType: data.registrationType,
        shopTypeId: data.shopTypeId,
      },
    });
  }

  countByOwnerUserId(ownerUserId: string) {
    return this.prisma.shop.count({
      where: { ownerUserId },
    });
  }

  async findPendingVerificationShops(filters?: {
    shopStatus?: 'pending_kyc' | 'pending_verification' | 'verified';
    registrationType?: 'NORMAL' | 'HANDMADE' | 'MANUFACTURER' | 'DISTRIBUTOR';
    categoryId?: string;
    search?: string;
    page?: number;
    pageSize?: number;
    sortBy?: 'createdAt' | 'shopName';
    sortOrder?: 'asc' | 'desc';
  }) {
    const page = filters?.page && filters.page > 0 ? filters.page : 1;
    const pageSize = filters?.pageSize && filters.pageSize > 0 ? filters.pageSize : 20;
    const sortBy = filters?.sortBy ?? 'createdAt';
    const sortOrder = filters?.sortOrder ?? 'desc';
    const where: Prisma.ShopWhereInput = {
      shopStatus: filters?.shopStatus ?? 'pending_verification',
      ...(filters?.registrationType
        ? {
            registrationType: filters.registrationType,
          }
        : {}),
      ...(filters?.categoryId
        ? {
            registeredCategories: {
              some: {
                categoryId: filters.categoryId,
              },
            },
          }
        : {}),
      ...(filters?.search
        ? {
            OR: [
              {
                shopName: {
                  contains: filters.search,
                  mode: 'insensitive',
                },
              },
              {
                owner: {
                  is: {
                    displayName: {
                      contains: filters.search,
                      mode: 'insensitive',
                    },
                  },
                },
              },
              {
                owner: {
                  is: {
                    email: {
                      contains: filters.search,
                      mode: 'insensitive',
                    },
                  },
                },
              },
              {
                owner: {
                  is: {
                    phone: {
                      contains: filters.search,
                      mode: 'insensitive',
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.shop.count({ where }),
      this.prisma.shop.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              displayName: true,
              email: true,
              phone: true,
            },
          },
          registeredCategories: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
          documents: {
            select: {
              reviewStatus: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { total, items };
  }

  async countShopsByStatusAndRegistrationType() {
    const [
      pendingKyc,
      pendingVerification,
      verified,
      normal,
      handmade,
      manufacturer,
      distributor,
    ] = await this.prisma.$transaction([
      this.prisma.shop.count({ where: { shopStatus: 'pending_kyc' } }),
      this.prisma.shop.count({ where: { shopStatus: 'pending_verification' } }),
      this.prisma.shop.count({ where: { shopStatus: 'verified' } }),
      this.prisma.shop.count({ where: { registrationType: ShopRegistrationType.NORMAL } }),
      this.prisma.shop.count({ where: { registrationType: ShopRegistrationType.HANDMADE } }),
      this.prisma.shop.count({ where: { registrationType: ShopRegistrationType.MANUFACTURER } }),
      this.prisma.shop.count({ where: { registrationType: ShopRegistrationType.DISTRIBUTOR } }),
    ]);

    return {
      byShopStatus: {
        pending_kyc: pendingKyc,
        pending_verification: pendingVerification,
        verified,
      },
      byRegistrationType: {
        NORMAL: normal,
        HANDMADE: handmade,
        MANUFACTURER: manufacturer,
        DISTRIBUTOR: distributor,
      },
    };
  }

  createAuditLog(input: {
    targetType: string;
    targetId: string;
    actorUserId: string;
    action: string;
    fromStatus?: string | null;
    toStatus?: string | null;
    note?: string | null;
    metadata?: Record<string, unknown> | null;
  }) {
    const metadataSql = input.metadata
      ? Prisma.sql`CAST(${JSON.stringify(input.metadata)} AS JSONB)`
      : Prisma.sql`NULL`;

    return this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO "audit_log" (
        "id",
        "target_type",
        "target_id",
        "actor_user_id",
        "action",
        "from_status",
        "to_status",
        "note",
        "metadata"
      )
      VALUES (
        ${randomUUID()},
        ${input.targetType},
        ${input.targetId},
        ${input.actorUserId},
        ${input.action},
        ${input.fromStatus ?? null},
        ${input.toStatus ?? null},
        ${input.note ?? null},
        ${metadataSql}
      )
    `);
  }

  findAuditLogsByTarget(targetType: string, targetId: string): Promise<AuditLogRecord[]> {
    return this.prisma
      .$queryRaw<
        Array<{
          id: string;
          action: string;
          fromStatus: string | null;
          toStatus: string | null;
          note: string | null;
          actorUserId: string;
          createdAt: Date;
          actorId: string;
          actorDisplayName: string | null;
          actorEmail: string | null;
        }>
      >(Prisma.sql`
        SELECT
          al.id,
          al.action,
          al.from_status AS "fromStatus",
          al.to_status AS "toStatus",
          al.note,
          al.actor_user_id AS "actorUserId",
          al.created_at AS "createdAt",
          u.id AS "actorId",
          u.display_name AS "actorDisplayName",
          u.email AS "actorEmail"
        FROM "audit_log" al
        INNER JOIN "user" u ON u.id = al.actor_user_id
        WHERE al.target_type = ${targetType}
          AND al.target_id = ${targetId}
        ORDER BY al.created_at DESC
      `)
      .then((rows) =>
        rows.map((row) => ({
          id: row.id,
          action: row.action,
          fromStatus: row.fromStatus,
          toStatus: row.toStatus,
          note: row.note,
          actorUserId: row.actorUserId,
          createdAt: row.createdAt,
          actor: {
            id: row.actorId,
            displayName: row.actorDisplayName,
            email: row.actorEmail,
          },
        })),
      );
  }

  countCategoriesByIds(categoryIds: string[]) {
    return this.prisma.category.count({
      where: {
        id: {
          in: categoryIds,
        },
      },
    });
  }

  findCategoriesByIds(categoryIds: string[]) {
    return this.prisma.category.findMany({
      where: {
        id: {
          in: categoryIds,
        },
      },
      select: {
        id: true,
        riskTier: true,
      },
    });
  }

  hasApprovedKycForOwner(ownerUserId: string) {
    return this.prisma.userKyc.findFirst({
      where: {
        userId: ownerUserId,
        verificationStatus: 'approved',
        documents: {
          some: {
            side: 'FRONT',
          },
        },
        AND: [
          {
            documents: {
              some: {
                side: 'BACK',
              },
            },
          },
        ],
      },
      select: {
        id: true,
      },
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
        ownerUserId: true,
        shopTypeId: true,
        registrationType: true,
        shopStatus: true,
      },
    });
  }

  findBrandById(brandId: string) {
    return this.prisma.brand.findUnique({
      where: {
        id: brandId,
      },
      select: {
        id: true,
      },
    });
  }

  createShopDocument(data: {
    shopId: string;
    requirementId?: string | null;
    docType: string;
    files: Array<{
      mediaAssetId: string;
      fileUrl: string;
    }>;
  }) {
    return this.prisma.shopDocument.create({
      data: {
        shopId: data.shopId,
        requirementId: data.requirementId ?? null,
        docType: data.docType,
        reviewStatus: 'pending',
        files: {
          create: data.files.map((file, index) => ({
            mediaAssetId: file.mediaAssetId,
            fileUrl: file.fileUrl,
            sortOrder: index,
          })),
        },
      },
      include: {
        files: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    });
  }

  upsertBrandAuthorization(data: {
    shopId: string;
    brandId: string;
    mediaAssetId: string | null;
    authorizationType: string;
    fileUrl: string;
  }) {
    return this.prisma.brandAuthorization.upsert({
      where: {
        shopId_brandId: {
          shopId: data.shopId,
          brandId: data.brandId,
        },
      },
      update: {
        mediaAssetId: data.mediaAssetId,
        authorizationType: data.authorizationType,
        fileUrl: data.fileUrl,
        verificationStatus: 'pending',
        reviewNote: null,
        verifiedAt: null,
      },
      create: {
        shopId: data.shopId,
        brandId: data.brandId,
        mediaAssetId: data.mediaAssetId,
        authorizationType: data.authorizationType,
        fileUrl: data.fileUrl,
        verificationStatus: 'pending',
      },
      include: {
        mediaAsset: true,
      },
    });
  }

  findBrandAuthorizationsByShopId(shopId: string) {
    return this.prisma.brandAuthorization.findMany({
      where: {
        shopId,
      },
      include: {
        mediaAsset: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  findBrandAuthorizationsForAdmin(input: { verificationStatus?: 'pending' | 'approved' | 'rejected' }) {
    return this.prisma.brandAuthorization.findMany({
      where: input.verificationStatus
        ? {
            verificationStatus: input.verificationStatus,
          }
        : undefined,
      include: {
        mediaAsset: true,
        brand: {
          select: {
            name: true,
          },
        },
        shop: {
          select: {
            shopName: true,
            registrationType: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  findBrandAuthorizationById(authorizationId: string) {
    return this.prisma.brandAuthorization.findUnique({
      where: {
        id: authorizationId,
      },
      include: {
        mediaAsset: true,
      },
    });
  }

  reviewBrandAuthorization(input: {
    authorizationId: string;
    verificationStatus: 'approved' | 'rejected';
    reviewNote: string | null;
  }) {
    return this.prisma.brandAuthorization.update({
      where: {
        id: input.authorizationId,
      },
      data: {
        verificationStatus: input.verificationStatus,
        reviewNote: input.reviewNote,
        verifiedAt: input.verificationStatus === 'approved' ? new Date() : null,
      },
      include: {
        mediaAsset: true,
      },
    });
  }

  reviewShopDocument(input: {
    shopId: string;
    documentId: string;
    reviewStatus: 'approved' | 'rejected';
    reviewNote: string | null;
  }) {
    return this.prisma.shopDocument.updateMany({
      where: {
        id: input.documentId,
        shopId: input.shopId,
      },
      data: {
        reviewStatus: input.reviewStatus,
        reviewNote: input.reviewNote,
        reviewedAt: new Date(),
      },
    });
  }

  findShopDocumentById(shopId: string, documentId: string) {
    return this.prisma.shopDocument.findFirst({
      where: {
        id: documentId,
        shopId,
      },
      select: {
        id: true,
        reviewStatus: true,
        docType: true,
      },
    });
  }

  findShopDocumentsByShopId(shopId: string) {
    return this.prisma.shopDocument.findMany({
      where: {
        shopId,
      },
      orderBy: {
        uploadedAt: 'asc',
      },
      select: {
        id: true,
        requirementId: true,
        docType: true,
        files: {
          orderBy: {
            sortOrder: 'asc',
          },
          select: {
            id: true,
            fileUrl: true,
            mediaAssetId: true,
            sortOrder: true,
            uploadedAt: true,
          },
        },
        reviewStatus: true,
        reviewNote: true,
        reviewedAt: true,
        uploadedAt: true,
      },
    });
  }

  findShopVerificationSummaryById(shopId: string) {
    return this.prisma.shop.findUnique({
      where: {
        id: shopId,
      },
      ...shopVerificationSummaryArgs,
    });
  }

  findAdminShopVerificationDetailById(shopId: string) {
    return this.prisma.shop.findUnique({
      where: {
        id: shopId,
      },
      ...adminShopVerificationDetailArgs,
    });
  }

  async recomputeShopStatus(shopId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      ...shopWithRelationsArgs,
    });

    if (!shop) {
      return null;
    }

    const hasApprovedKyc =
      shop.owner.kyc?.verificationStatus === 'approved' &&
      shop.owner.kyc.documents.some((document) => document.side === 'FRONT') &&
      shop.owner.kyc.documents.some((document) => document.side === 'BACK');

    let nextStatus = 'pending_kyc';
    if (hasApprovedKyc) {
      const hasApprovedShopDocument = shop.documents.some((document) => document.reviewStatus === 'approved');

      nextStatus = hasApprovedShopDocument ? 'verified' : 'pending_verification';
    }

    return this.prisma.shop.update({
      where: { id: shopId },
      data: {
        shopStatus: nextStatus,
      },
      include: {
        registeredCategories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });
  }
}
