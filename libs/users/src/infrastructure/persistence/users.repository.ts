import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';
import { createHash, randomUUID } from 'crypto';

const userKycWithDocumentsArgs = Prisma.validator<Prisma.UserKycDefaultArgs>()({
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
});

const userKycWithHistoryArgs = Prisma.validator<Prisma.UserKycDefaultArgs>()({
  include: {
    user: {
      select: {
        id: true,
        email: true,
        phone: true,
        displayName: true,
      },
    },
    documents: {
      include: {
        mediaAsset: true,
      },
      orderBy: {
        uploadedAt: 'asc',
      },
    },
    submissions: {
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
      orderBy: {
        submittedAt: 'desc',
      },
    },
  },
});

const pendingUserKycsArgs = Prisma.validator<Prisma.UserKycDefaultArgs>()({
  include: {
    user: {
      select: {
        id: true,
        email: true,
        phone: true,
        displayName: true,
      },
    },
    documents: {
      include: {
        mediaAsset: true,
      },
      orderBy: {
        uploadedAt: 'asc',
      },
    },
  },
});

export type UserKycWithDocuments = Prisma.UserKycGetPayload<typeof userKycWithDocumentsArgs>;
export type PendingUserKycRecord = Prisma.UserKycGetPayload<typeof pendingUserKycsArgs>;
export type UserKycWithHistory = Prisma.UserKycGetPayload<typeof userKycWithHistoryArgs>;
export type AuditLogRecord = {
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

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        avatarMedia: {
          select: {
            secureUrl: true,
          },
        },
        ownedShops: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
          },
        },
      },
    });
  }

  findDefaultAddressByUserId(userId: string) {
    return this.prisma.userAddress.findFirst({
      where: {
        userId,
        isDefault: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listNotifications(input: { userId: string; filter?: 'unread' | 'readed'; page?: number; pageSize?: number }) {
    const page = Math.max(1, Number(input.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(input.pageSize || 20)));
    const where: Prisma.NotificationWhereInput = {
      userId: input.userId,
      ...(input.filter === 'unread' ? { readAt: null } : {}),
      ...(input.filter === 'readed' ? { readAt: { not: null } } : {}),
    };

    const [total, unreadCount, items] = await this.prisma.$transaction([
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId: input.userId, readAt: null } }),
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { total, unreadCount, page, pageSize, items };
  }

  async markNotificationRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      return null;
    }

    return this.prisma.notification.update({
      where: { id: notification.id },
      data: { readAt: notification.readAt ?? new Date() },
    });
  }

  markAllNotificationsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  createNotification(input: {
    userId: string;
    notificationType: string;
    title: string;
    body: string;
    targetType?: string | null;
    targetId?: string | null;
    dedupeKey: string;
  }) {
    return this.prisma.notification.upsert({
      where: { dedupeKey: input.dedupeKey },
      update: {
        title: input.title,
        body: input.body,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
      },
      create: {
        userId: input.userId,
        notificationType: input.notificationType,
        title: input.title,
        body: input.body,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        dedupeKey: input.dedupeKey,
      },
    });
  }

  registerNotificationFcmToken(input: { userId: string; token: string; deviceId?: string | null; userAgent?: string | null }) {
    const tokenHash = hashFcmToken(input.token);

    return this.prisma.notificationFcmToken.upsert({
      where: { tokenHash },
      update: {
        userId: input.userId,
        token: input.token,
        deviceId: input.deviceId ?? null,
        userAgent: input.userAgent ?? null,
        revokedAt: null,
      },
      create: {
        userId: input.userId,
        token: input.token,
        tokenHash,
        deviceId: input.deviceId ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  }

  revokeNotificationFcmToken(input: { userId: string; token?: string | null; deviceId?: string | null }) {
    const tokenHash = input.token ? hashFcmToken(input.token) : null;
    const where: Prisma.NotificationFcmTokenWhereInput = {
      userId: input.userId,
      revokedAt: null,
      ...(tokenHash ? { tokenHash } : {}),
      ...(!tokenHash && input.deviceId ? { deviceId: input.deviceId } : {}),
    };

    return this.prisma.notificationFcmToken.updateMany({
      where,
      data: { revokedAt: new Date() },
    });
  }

  listActiveNotificationFcmTokens(userId: string) {
    return this.prisma.notificationFcmToken.findMany({
      where: { userId, revokedAt: null },
      orderBy: { updatedAt: 'desc' },
    });
  }

  recordNotificationDeliveryAttempt(input: {
    userId: string;
    notificationId?: string | null;
    eventName: string;
    provider: string;
    status: string;
    errorCode?: string | null;
    errorMessage?: string | null;
  }) {
    return this.prisma.notificationDeliveryAttempt.create({
      data: {
        userId: input.userId,
        notificationId: input.notificationId ?? null,
        eventName: input.eventName,
        provider: input.provider,
        status: input.status,
        errorCode: input.errorCode ?? null,
        errorMessage: input.errorMessage ?? null,
      },
    });
  }

  listUserAddresses(userId: string) {
    return this.prisma.userAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createUserAddress(input: {
    userId: string;
    recipientName: string;
    phone: string;
    addressLine: string;
    provinceCode?: string | null;
    provinceName?: string | null;
    wardCode?: string | null;
    wardName?: string | null;
    isDefault?: boolean;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const existingCount = await tx.userAddress.count({ where: { userId: input.userId } });
      const shouldBeDefault = Boolean(input.isDefault) || existingCount === 0;

      if (shouldBeDefault) {
        await tx.userAddress.updateMany({
          where: { userId: input.userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.userAddress.create({
        data: {
          userId: input.userId,
          recipientName: input.recipientName,
          phone: input.phone,
          addressLine: input.addressLine,
          provinceCode: input.provinceCode ?? null,
          provinceName: input.provinceName ?? null,
          wardCode: input.wardCode ?? null,
          wardName: input.wardName ?? null,
          isDefault: shouldBeDefault,
        },
      });
    });
  }

  async updateUserAddress(input: {
    userId: string;
    addressId: string;
    recipientName?: string;
    phone?: string;
    addressLine?: string;
    provinceCode?: string | null;
    provinceName?: string | null;
    wardCode?: string | null;
    wardName?: string | null;
    isDefault?: boolean;
  }) {
    return this.prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.userAddress.updateMany({
          where: { userId: input.userId, isDefault: true, id: { not: input.addressId } },
          data: { isDefault: false },
        });
      }

      await tx.userAddress.findFirstOrThrow({
        where: { id: input.addressId, userId: input.userId },
      });

      return tx.userAddress.update({
        where: {
          id: input.addressId,
        },
        data: {
          recipientName: input.recipientName,
          phone: input.phone,
          addressLine: input.addressLine,
          provinceCode: input.provinceCode,
          provinceName: input.provinceName,
          wardCode: input.wardCode,
          wardName: input.wardName,
          isDefault: input.isDefault,
        },
      });
    });
  }

  async setDefaultUserAddress(userId: string, addressId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.userAddress.findFirstOrThrow({
        where: {
          id: addressId,
          userId,
        },
      });

      await tx.userAddress.updateMany({
        where: { userId, isDefault: true, id: { not: addressId } },
        data: { isDefault: false },
      });

      return tx.userAddress.update({
        where: {
          id: addressId,
        },
        data: { isDefault: true },
      });
    });
  }

  async deleteUserAddress(userId: string, addressId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.userAddress.findFirstOrThrow({
        where: { id: addressId, userId },
      });

      const deleted = await tx.userAddress.delete({
        where: {
          id: addressId,
        },
      });

      if (deleted.isDefault) {
        const nextDefault = await tx.userAddress.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });

        if (nextDefault) {
          await tx.userAddress.update({
            where: { id: nextDefault.id },
            data: { isDefault: true },
          });
        }
      }

      return deleted;
    });
  }

  findByIdentifier(identifier: { email?: string | null; phone?: string | null }) {
    const { email, phone } = identifier;

    return this.prisma.user.findFirst({
      where: {
        OR: [
          email ? { email } : undefined,
          phone ? { phone } : undefined,
        ].filter(Boolean) as Array<{ email?: string; phone?: string }>,
      },
      include: {
        avatarMedia: {
          select: {
            secureUrl: true,
          },
        },
        ownedShops: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
          },
        },
      },
    });
  }

  async replaceUserAvatar(userId: string, avatarMediaId: string) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        include: {
          avatarMedia: {
            select: {
              id: true,
              publicId: true,
            },
          },
        },
      });

      const updated = await tx.user.update({
        where: { id: userId },
        data: { avatarMediaId },
      });

      return {
        user: updated,
        previousAvatar: current.avatarMedia,
      };
    });
  }

  create(data: {
    email: string | null;
    phone: string | null;
    displayName: string | null;
    password: string;
    role?: string;
  }) {
    return this.prisma.user.create({ data });
  }

  updatePassword(userId: string, password: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { password },
    });
  }

  findAll(role?: string) {
    return this.prisma.user.findMany({
      where: role ? { role } : undefined,
      include: {
        ownedShops: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            shopName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listForAdmin(input: {
    role: 'user';
    status: 'all' | 'active' | 'inactive' | 'blocked' | 'banned';
    page: number;
    pageSize: number;
  }) {
    const baseWhere: Prisma.UserWhereInput = { role: input.role };
    const statusWhere: Prisma.UserWhereInput =
      input.status === 'all'
        ? {}
        : input.status === 'banned'
          ? { accountStatus: { not: 'active' } }
          : { accountStatus: input.status };
    const where = { ...baseWhere, ...statusWhere };

    const [totalItems, totalUser, totalShop, activeUser, bannedUser, items] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.count({ where: baseWhere }),
      this.prisma.shop.count({ where: { owner: { is: baseWhere } } }),
      this.prisma.user.count({ where: { ...baseWhere, accountStatus: 'active' } }),
      this.prisma.user.count({ where: { ...baseWhere, accountStatus: { not: 'active' } } }),
      this.prisma.user.findMany({
        where,
        include: {
          avatarMedia: { select: { secureUrl: true } },
          ownedShops: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { shopName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
    ]);

    return { totalItems, totalUser, totalShop, activeUser, bannedUser, items };
  }

  findUserById(id: string) {
    return this.prisma.user.findFirst({
      where: {
        id,
        role: 'user',
      },
    });
  }

  async findAdminUserDetailById(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, role: 'user' },
      include: {
        avatarMedia: { select: { secureUrl: true } },
        addresses: {
          where: { isDefault: true },
          take: 1,
          select: { addressLine: true },
        },
        ownedShops: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            avatarMedia: { select: { secureUrl: true } },
            bannerMedia: { select: { secureUrl: true } },
            registeredCategories: {
              where: { registrationStatus: 'approved' },
              orderBy: { createdAt: 'asc' },
              select: { category: { select: { name: true } } },
            },
            _count: { select: { offers: true } },
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    const shop = user.ownedShops[0];
    const [orders, posts, reports, receivedReviews, positiveReviews, shopReviewStats, shopSaleStats, shopRevenueStats] =
      await Promise.all([
        this.prisma.order.count({ where: { buyerUserId: id } }),
        this.prisma.socialPost.count({ where: { authorUserId: id } }),
        this.prisma.report.count({ where: { reporterUserId: id } }),
        this.prisma.review.count({ where: { toUserId: id } }),
        this.prisma.review.count({ where: { toUserId: id, rating: { gte: 4 } } }),
        shop
          ? this.prisma.review.aggregate({
              where: {
                OR: [
                  { orderItem: { is: { orderShopGroup: { is: { shopId: shop.id } } } } },
                  { orderItemId: null, order: { shopId: shop.id } },
                ],
              },
              _avg: { rating: true },
              _count: { _all: true },
            })
          : null,
        shop
          ? this.prisma.orderItem.aggregate({
              where: { orderShopGroup: { is: { shopId: shop.id, fulfillmentStatus: 'DELIVERED' } } },
              _sum: { quantity: true },
            })
          : null,
        shop
          ? this.prisma.orderShopGroup.aggregate({
              where: { shopId: shop.id, fulfillmentStatus: 'DELIVERED' },
              _sum: { sellerReceivableAmount: true },
            })
          : null,
      ]);

    return {
      user,
      orders,
      posts,
      reports,
      receivedReviews,
      positiveReviews,
      shopMetrics: shop
        ? {
            rating: Number((shopReviewStats?._avg.rating ?? 0).toFixed(1)),
            reviewCount: shopReviewStats?._count._all ?? 0,
            totalSold: shopSaleStats?._sum.quantity ?? 0,
            revenue: Number(shopRevenueStats?._sum.sellerReceivableAmount ?? 0),
          }
        : null,
    };
  }

  findUserKycByUserId(userId: string): Promise<UserKycWithDocuments | null> {
    return this.prisma.userKyc.findUnique({
      where: { userId },
      ...userKycWithDocumentsArgs,
    });
  }

  findUserKycWithHistoryByUserId(userId: string): Promise<UserKycWithHistory | null> {
    return this.prisma.userKyc.findUnique({
      where: { userId },
      ...userKycWithHistoryArgs,
    });
  }

  async findPendingKycs(input?: {
    verificationStatus?: 'pending' | 'approved' | 'rejected';
    search?: string;
    page?: number;
    pageSize?: number;
    sortBy?: 'id' | 'fullName' | 'verifiedAt';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ total: number; items: PendingUserKycRecord[] }> {
    const page = input?.page && input.page > 0 ? input.page : 1;
    const pageSize = input?.pageSize && input.pageSize > 0 ? input.pageSize : 20;
    const sortBy = input?.sortBy ?? 'id';
    const sortOrder = input?.sortOrder ?? 'desc';
    const where: Prisma.UserKycWhereInput = {
      verificationStatus: input?.verificationStatus ?? 'pending',
      ...(input?.search
        ? {
            OR: [
              {
                fullName: {
                  contains: input.search,
                  mode: 'insensitive',
                },
              },
              {
                user: {
                  is: {
                    email: {
                      contains: input.search,
                      mode: 'insensitive',
                    },
                  },
                },
              },
              {
                user: {
                  is: {
                    phone: {
                      contains: input.search,
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
      this.prisma.userKyc.count({ where }),
      this.prisma.userKyc.findMany({
        where,
        ...pendingUserKycsArgs,
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { total, items };
  }

  async countKycsByVerificationStatus() {
    const [pending, approved, rejected] = await this.prisma.$transaction([
      this.prisma.userKyc.count({ where: { verificationStatus: 'pending' } }),
      this.prisma.userKyc.count({ where: { verificationStatus: 'approved' } }),
      this.prisma.userKyc.count({ where: { verificationStatus: 'rejected' } }),
    ]);

    return {
      pending,
      approved,
      rejected,
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

  findUserByEmailOrPhone(identifier: { email?: string | null; phone?: string | null }, excludeId?: string) {
    const { email, phone } = identifier;

    return this.prisma.user.findFirst({
      where: {
        id: excludeId ? { not: excludeId } : undefined,
        OR: [
          email ? { email } : undefined,
          phone ? { phone } : undefined,
        ].filter(Boolean) as Array<{ email?: string; phone?: string }>,
      },
    });
  }

  updateUser(
    id: string,
    data: {
      email?: string | null;
      phone?: string | null;
      displayName?: string | null;
      accountStatus?: string;
      avatarMediaId?: string | null;
    },
  ) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async submitKyc(input: {
    userId: string;
    fullName: string;
    dateOfBirth: Date;
    idType: string;
    idNumberHash: string;
    documentMediaAssets: Array<{
      side: 'FRONT' | 'BACK';
      mediaAssetId: string;
    }>;
  }): Promise<UserKycWithDocuments> {
    return this.prisma.$transaction(async (tx) => {
      const userKyc = await tx.userKyc.upsert({
        where: { userId: input.userId },
        create: {
          userId: input.userId,
          fullName: input.fullName,
          dateOfBirth: input.dateOfBirth,
          kycLevel: 'basic',
          idType: input.idType,
          idNumberHash: input.idNumberHash,
          verificationStatus: 'pending',
          verifiedAt: null,
          reviewNote: null,
        },
        update: {
          fullName: input.fullName,
          dateOfBirth: input.dateOfBirth,
          kycLevel: 'basic',
          idType: input.idType,
          idNumberHash: input.idNumberHash,
          verificationStatus: 'pending',
          verifiedAt: null,
          reviewNote: null,
        },
      });

      const submissionCount = await tx.userKycSubmission.count({
        where: {
          userKycId: userKyc.id,
        },
      });

      await tx.userKycDocument.deleteMany({
        where: {
          userKycId: userKyc.id,
        },
      });

      await tx.userKycDocument.createMany({
        data: input.documentMediaAssets.map((document) => ({
          userKycId: userKyc.id,
          mediaAssetId: document.mediaAssetId,
          side: document.side,
        })),
      });

      const submission = await tx.userKycSubmission.create({
        data: {
          userKycId: userKyc.id,
          submissionNumber: submissionCount + 1,
          verificationStatus: 'pending',
        },
      });

      await tx.userKycSubmissionDocument.createMany({
        data: input.documentMediaAssets.map((document) => ({
          submissionId: submission.id,
          mediaAssetId: document.mediaAssetId,
          side: document.side,
        })),
      });

      return tx.userKyc.findUniqueOrThrow({
        where: { userId: input.userId },
        ...userKycWithDocumentsArgs,
      });
    });
  }

  reviewUserKyc(input: {
    userId: string;
    verificationStatus: 'approved' | 'rejected';
    reviewNote: string | null;
  }): Promise<UserKycWithDocuments> {
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const latestSubmission = await tx.userKycSubmission.findFirst({
        where: {
          userKyc: {
            userId: input.userId,
          },
        },
        orderBy: {
          submittedAt: 'desc',
        },
        select: {
          id: true,
        },
      });

      if (latestSubmission) {
        await tx.userKycSubmission.update({
          where: {
            id: latestSubmission.id,
          },
          data: {
            verificationStatus: input.verificationStatus,
            reviewNote: input.reviewNote,
            reviewedAt: now,
          },
        });
      }

      return tx.userKyc.update({
        where: { userId: input.userId },
        data: {
          verificationStatus: input.verificationStatus,
          reviewNote: input.reviewNote,
          verifiedAt: input.verificationStatus === 'approved' ? now : null,
        },
        ...userKycWithDocumentsArgs,
      });
    });
  }

  markOwnedShopsAfterKycSubmitted(userId: string) {
    return this.prisma.$transaction([
      this.prisma.shop.updateMany({
        where: {
          ownerUserId: userId,
          shopStatus: { in: ['pending_kyc', 'rejected'] },
          documents: {
            some: {},
          },
        },
        data: {
          shopStatus: 'pending_document',
        },
      }),
      this.prisma.shop.updateMany({
        where: {
          ownerUserId: userId,
          shopStatus: { in: ['pending_kyc', 'rejected'] },
          documents: {
            none: {},
          },
        },
        data: {
          shopStatus: 'pending_document',
        },
      }),
    ]);
  }
}

function hashFcmToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
