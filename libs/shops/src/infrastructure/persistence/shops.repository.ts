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
        documents: {
          orderBy: {
            uploadedAt: 'asc',
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
        documents: {
          orderBy: {
            uploadedAt: 'asc',
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

  findByOwnerUserId(ownerUserId: string) {
    return this.prisma.shop.findMany({
      where: { ownerUserId },
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
      orderBy: { createdAt: 'desc' },
    });
  }

  updateProfile(
    shopId: string,
    data: {
      shopName?: string;
      businessType?: string;
      taxCode?: string | null;
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

  countByOwnerUserId(ownerUserId: string) {
    return this.prisma.shop.count({
      where: { ownerUserId },
    });
  }

  async findPendingVerificationShops(filters?: {
    shopStatus?: 'pending_kyc' | 'pending_verification' | 'active';
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
      active,
      normal,
      handmade,
      manufacturer,
      distributor,
    ] = await this.prisma.$transaction([
      this.prisma.shop.count({ where: { shopStatus: 'pending_kyc' } }),
      this.prisma.shop.count({ where: { shopStatus: 'pending_verification' } }),
      this.prisma.shop.count({ where: { shopStatus: 'active' } }),
      this.prisma.shop.count({ where: { registrationType: ShopRegistrationType.NORMAL } }),
      this.prisma.shop.count({ where: { registrationType: ShopRegistrationType.HANDMADE } }),
      this.prisma.shop.count({ where: { registrationType: ShopRegistrationType.MANUFACTURER } }),
      this.prisma.shop.count({ where: { registrationType: ShopRegistrationType.DISTRIBUTOR } }),
    ]);

    return {
      byShopStatus: {
        pending_kyc: pendingKyc,
        pending_verification: pendingVerification,
        active,
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

  findShopBusinessCategory(shopId: string, categoryId: string) {
    return this.prisma.shopBusinessCategory.findFirst({
      where: {
        shopId,
        categoryId,
      },
      include: {
        category: {
          select: {
            id: true,
            riskTier: true,
          },
        },
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

  createCategoryDocument(data: {
    shopBusinessCategoryId: string;
    mediaAssetId: string;
    documentType: string;
    fileUrl: string;
    documentNumber: string | null;
    issuedBy: string | null;
    issuedAt: Date | null;
    expiresAt: Date | null;
  }) {
    return this.prisma.shopCategoryDocument.create({
      data: {
        shopBusinessCategoryId: data.shopBusinessCategoryId,
        mediaAssetId: data.mediaAssetId,
        documentType: data.documentType,
        fileUrl: data.fileUrl,
        documentNumber: data.documentNumber,
        issuedBy: data.issuedBy,
        issuedAt: data.issuedAt,
        expiresAt: data.expiresAt,
        reviewStatus: 'pending',
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

  reviewShopCategory(input: {
    shopId: string;
    categoryId: string;
    registrationStatus: 'approved' | 'rejected';
    reviewNote: string | null;
  }) {
    return this.prisma.shopBusinessCategory.updateMany({
      where: {
        shopId: input.shopId,
        categoryId: input.categoryId,
      },
      data: {
        registrationStatus: input.registrationStatus,
        reviewNote: input.reviewNote,
        approvedAt: input.registrationStatus === 'approved' ? new Date() : null,
      },
    });
  }

  markShopCategoryPendingReview(shopId: string, categoryId: string) {
    return this.prisma.shopBusinessCategory.updateMany({
      where: {
        shopId,
        categoryId,
        registrationStatus: 'rejected',
      },
      data: {
        registrationStatus: 'pending',
        reviewNote: null,
        approvedAt: null,
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

  findCategoryDocumentsByShopId(shopId: string, categoryId: string) {
    return this.prisma.shopCategoryDocument.findMany({
      where: {
        shopBusinessCategory: {
          shopId,
          categoryId,
        },
      },
      orderBy: {
        uploadedAt: 'asc',
      },
      select: {
        id: true,
        documentType: true,
        fileUrl: true,
        mediaAssetId: true,
        documentNumber: true,
        issuedBy: true,
        issuedAt: true,
        expiresAt: true,
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
      const requiresShopVerification =
        shop.registrationType === ShopRegistrationType.MANUFACTURER ||
        shop.registrationType === ShopRegistrationType.DISTRIBUTOR;
      const requiresCategoryVerification = shop.registeredCategories.some(
        (item) => item.category.riskTier.trim().toLowerCase() !== 'low',
      );

      const hasApprovedShopDocument = shop.documents.some((document) => document.reviewStatus === 'approved');
      const hasPendingCategoryRegistration = shop.registeredCategories.some(
        (item) => item.registrationStatus !== 'approved',
      );

      if (
        (requiresShopVerification && !hasApprovedShopDocument) ||
        (requiresCategoryVerification && hasPendingCategoryRegistration) ||
        (requiresShopVerification && hasPendingCategoryRegistration)
      ) {
        nextStatus = 'pending_verification';
      } else {
        nextStatus = 'active';
      }
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
