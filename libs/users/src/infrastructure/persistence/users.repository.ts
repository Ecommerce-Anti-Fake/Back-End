import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';

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

  findAll(role?: string) {
    return this.prisma.user.findMany({
      where: role ? { role } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  findUserById(id: string) {
    return this.prisma.user.findFirst({
      where: {
        id,
        role: 'user',
      },
    });
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
    phone: string;
    idType: string;
    idNumberHash: string;
    documentMediaAssets: Array<{
      side: 'FRONT' | 'BACK';
      mediaAssetId: string;
    }>;
  }): Promise<UserKycWithDocuments> {
    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: input.userId },
        data: {
          phone: input.phone,
          displayName: input.fullName,
        },
      });

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
}
