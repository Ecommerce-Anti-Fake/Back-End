import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma/prisma.service';

@Injectable()
export class LiveCommerceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listLiveSessions(input: {
    requesterUserId?: string | null;
    filter?: 'all' | 'live' | 'upcoming';
    q?: string | null;
    shopId?: string | null;
    includeTerminal?: boolean;
  }) {
    const now = new Date();
    const search = input.q?.trim();
    const baseWhere = {
      ...(input.shopId ? { shopId: input.shopId } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' as const } },
              {
                description: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              {
                shop: {
                  shopName: {
                    contains: search,
                    mode: 'insensitive' as const,
                  },
                },
              },
            ],
          }
        : {}),
    };
    const include = this.liveSessionInclude(input.requesterUserId);

    if (input.filter === 'live') {
      return this.prisma.liveCommerceSession.findMany({
        where: { ...baseWhere, status: 'LIVE' },
        include,
        orderBy: { startAt: 'asc' },
        take: 50,
      });
    }

    if (input.filter === 'upcoming') {
      return this.prisma.liveCommerceSession.findMany({
        where: {
          ...baseWhere,
          status: 'SCHEDULED',
          startAt: { gte: now },
        },
        include,
        orderBy: { startAt: 'asc' },
        take: 50,
      });
    }

    if (input.includeTerminal) {
      return this.prisma.liveCommerceSession.findMany({
        where: baseWhere,
        include,
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    }

    const [liveSessions, scheduledSessions] = await Promise.all([
      this.prisma.liveCommerceSession.findMany({
        where: { ...baseWhere, status: 'LIVE' },
        include,
        orderBy: { startAt: 'asc' },
        take: 50,
      }),
      this.prisma.liveCommerceSession.findMany({
        where: {
          ...baseWhere,
          status: 'SCHEDULED',
          startAt: { gte: now },
        },
        include,
        orderBy: { startAt: 'asc' },
        take: 50,
      }),
    ]);

    return [...liveSessions, ...scheduledSessions].slice(0, 50);
  }

  findShopForLiveSession(shopId: string) {
    return this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { id: true, ownerUserId: true, shopName: true, shopStatus: true },
    });
  }

  findOffersForLiveSession(offerIds: string[]) {
    return this.prisma.offer.findMany({
      where: { id: { in: offerIds } },
      select: {
        id: true,
        shopId: true,
        offerStatus: true,
        variants: {
          where: { isActive: true },
          select: { availableQuantity: true },
        },
      },
    });
  }

  createLiveSession(input: {
    sessionId: string;
    shopId: string;
    title: string;
    description?: string | null;
    coverUrl?: string | null;
    startAt: Date;
    playbackUrl?: string | null;
    streamProvider?: string | null;
    streamProviderSessionId?: string | null;
    streamIngestUrl?: string | null;
    providerStatus?: string | null;
    streamLatencyTargetMs?: number | null;
    recordingUrl?: string | null;
    recordingRetentionDays?: number | null;
    offerIds: string[];
    voucherIds: string[];
    requesterUserId: string;
  }) {
    return this.prisma.liveCommerceSession.create({
      data: {
        id: input.sessionId,
        shopId: input.shopId,
        title: input.title,
        description: input.description ?? null,
        coverUrl: input.coverUrl ?? null,
        startAt: input.startAt,
        playbackUrl: input.playbackUrl ?? null,
        streamProvider: input.streamProvider ?? null,
        streamProviderSessionId: input.streamProviderSessionId ?? null,
        streamIngestUrl: input.streamIngestUrl ?? null,
        providerStatus: input.providerStatus ?? null,
        streamLatencyTargetMs: input.streamLatencyTargetMs ?? null,
        recordingUrl: input.recordingUrl ?? null,
        recordingRetentionDays: input.recordingRetentionDays ?? null,
        offers: {
          create: input.offerIds.map((offerId, index) => ({
            offerId,
            sortOrder: index,
          })),
        },
        vouchers: {
          create: input.voucherIds.map((voucherId, index) => ({
            voucherId,
            sortOrder: index,
          })),
        },
      },
      include: this.liveSessionInclude(input.requesterUserId),
    });
  }

  findLiveSessionById(sessionId: string, requesterUserId?: string | null) {
    return this.prisma.liveCommerceSession.findUnique({
      where: { id: sessionId },
      include: this.liveSessionInclude(requesterUserId),
    });
  }

  findVouchersForLiveSession(voucherIds: string[]) {
    return this.prisma.voucher.findMany({
      where: { id: { in: voucherIds } },
      select: {
        id: true,
        ownerType: true,
        shopId: true,
        status: true,
        startsAt: true,
        endsAt: true,
      },
    });
  }

  updateLiveSessionStatus(input: {
    sessionId: string;
    status: 'ENDED' | 'CANCELLED';
    requesterUserId: string;
    actualEndedAt?: Date;
  }) {
    return this.prisma.liveCommerceSession.update({
      where: { id: input.sessionId },
      data: {
        status: input.status,
        providerStatus: 'IDLE',
        providerEventAt: new Date(),
        providerEventType:
          input.status === 'ENDED'
            ? 'agora.publisher.ended'
            : 'agora.session.cancelled',
        ...(input.actualEndedAt ? { actualEndedAt: input.actualEndedAt } : {}),
      },
      include: this.liveSessionInclude(input.requesterUserId),
    });
  }

  async updatePinnedOfferAtomic(input: {
    sessionId: string;
    offerId: string | null;
    requesterUserId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const lockedSessions = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "live_commerce_session"
        WHERE "id" = ${input.sessionId}
        FOR UPDATE
      `;
      if (!lockedSessions[0]) {
        return { kind: 'NOT_FOUND' as const };
      }

      const current = await tx.liveCommerceSession.findUnique({
        where: { id: input.sessionId },
        include: this.liveSessionInclude(input.requesterUserId),
      });
      if (!current) {
        return { kind: 'NOT_FOUND' as const };
      }
      if (current.status !== 'SCHEDULED' && current.status !== 'LIVE') {
        return { kind: 'INVALID_STATUS' as const, session: current };
      }
      if (current.pinnedOfferId === input.offerId) {
        return { kind: 'OK' as const, changed: false, session: current };
      }

      if (input.offerId) {
        const attached = current.offers.find(
          ({ offer }) => offer.id === input.offerId,
        )?.offer;
        const availableQuantity = attached?.variants.reduce(
          (sum, variant) => sum + variant.availableQuantity,
          0,
        );
        if (
          !attached ||
          attached.shopId !== current.shopId ||
          attached.offerStatus !== 'active' ||
          (availableQuantity ?? 0) <= 0
        ) {
          return { kind: 'INVALID_OFFER' as const, session: current };
        }
      }

      const session = await tx.liveCommerceSession.update({
        where: { id: input.sessionId },
        data: { pinnedOfferId: input.offerId },
        include: this.liveSessionInclude(input.requesterUserId),
      });
      return { kind: 'OK' as const, changed: true, session };
    });
  }

  async replaceLiveSessionOffersAtomic(input: {
    sessionId: string;
    offerIds: string[];
    requesterUserId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const lockedSessions = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "live_commerce_session"
        WHERE "id" = ${input.sessionId}
        FOR UPDATE
      `;
      if (!lockedSessions[0]) {
        return { kind: 'NOT_FOUND' as const };
      }

      const current = await tx.liveCommerceSession.findUnique({
        where: { id: input.sessionId },
        include: this.liveSessionInclude(input.requesterUserId),
      });
      if (!current) {
        return { kind: 'NOT_FOUND' as const };
      }
      if (current.status !== 'SCHEDULED' && current.status !== 'LIVE') {
        return { kind: 'INVALID_STATUS' as const, session: current };
      }
      if (
        current.pinnedOfferId &&
        !input.offerIds.includes(current.pinnedOfferId)
      ) {
        return { kind: 'PINNED_OFFER_CONFLICT' as const, session: current };
      }

      const currentIds = current.offers.map(({ offerId }) => offerId);
      const unchanged =
        currentIds.length === input.offerIds.length &&
        currentIds.every((offerId, index) => offerId === input.offerIds[index]);
      if (unchanged) {
        return { kind: 'OK' as const, changed: false, session: current };
      }

      await tx.liveSessionOffer.deleteMany({
        where: { sessionId: input.sessionId },
      });
      if (input.offerIds.length) {
        await tx.liveSessionOffer.createMany({
          data: input.offerIds.map((offerId, sortOrder) => ({
            sessionId: input.sessionId,
            offerId,
            sortOrder,
          })),
        });
      }
      const session = await tx.liveCommerceSession.findUniqueOrThrow({
        where: { id: input.sessionId },
        include: this.liveSessionInclude(input.requesterUserId),
      });
      return { kind: 'OK' as const, changed: true, session };
    });
  }

  async markLiveSessionLive(input: {
    sessionId: string;
    requesterUserId: string;
    startedAt: Date;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const lockedSessions = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "live_commerce_session"
        WHERE "id" = ${input.sessionId}
        FOR UPDATE
      `;
      if (!lockedSessions[0]) {
        return { startedNow: false, session: null, reminderUserIds: [] };
      }

      const result = await tx.liveCommerceSession.updateMany({
        where: {
          id: input.sessionId,
          status: 'SCHEDULED',
          streamProvider: 'AGORA_RTC',
        },
        data: {
          status: 'LIVE',
          providerStatus: 'CONNECTED',
          actualStartedAt: input.startedAt,
          providerEventAt: input.startedAt,
          providerEventType: 'agora.publisher.started',
          providerErrorCode: null,
          providerErrorMessage: null,
        },
      });
      const session = await tx.liveCommerceSession.findUnique({
        where: { id: input.sessionId },
        include: this.liveSessionInclude(input.requesterUserId),
      });
      const reminders = await tx.liveSessionReminder.findMany({
        where: { sessionId: input.sessionId },
        select: { userId: true },
      });

      return {
        startedNow: result.count === 1,
        session,
        reminderUserIds: reminders.map((reminder) => reminder.userId),
      };
    });
  }

  async remindLiveSession(input: { sessionId: string; userId: string }) {
    return this.prisma.$transaction(async (tx) => {
      const lockedSessions = await tx.$queryRaw<
        Array<{ id: string; status: string }>
      >`
        SELECT "id", "status"::text AS "status"
        FROM "live_commerce_session"
        WHERE "id" = ${input.sessionId}
        FOR UPDATE
      `;
      if (!lockedSessions[0]) return null;

      if (lockedSessions[0].status === 'SCHEDULED') {
        await tx.liveSessionReminder.upsert({
          where: {
            sessionId_userId: {
              sessionId: input.sessionId,
              userId: input.userId,
            },
          },
          create: input,
          update: {},
        });
      }

      return tx.liveCommerceSession.findUnique({
        where: { id: input.sessionId },
        include: this.liveSessionInclude(input.userId),
      });
    });
  }

  async getLiveSessionAnalytics(sessionId: string) {
    const [reminderCount, commentCount, commerceRows] = await Promise.all([
      this.prisma.liveSessionReminder.count({ where: { sessionId } }),
      this.prisma.liveSessionComment.count({ where: { sessionId } }),
      this.prisma.$queryRaw<
        Array<{
          conversion_count: bigint;
          units_sold: bigint;
          gross_revenue: unknown;
        }>
      >`
        SELECT
          COUNT(DISTINCT oi."order_id")::bigint AS conversion_count,
          COALESCE(SUM(oi."quantity"), 0)::bigint AS units_sold,
          COALESCE(SUM(oi."unit_price" * oi."quantity"), 0) AS gross_revenue
        FROM "order_item" oi
        INNER JOIN "order" o ON o."id" = oi."order_id"
        WHERE oi."source_live_session_id" = ${sessionId}
          AND o."order_status" NOT IN ('cancelled', 'failed', 'refunded')
      `,
    ]);
    const commerce = commerceRows[0];

    return {
      reminderCount,
      commentCount,
      conversionCount: Number(commerce?.conversion_count ?? 0),
      unitsSold: Number(commerce?.units_sold ?? 0),
      grossRevenue: Number(commerce?.gross_revenue ?? 0),
    };
  }

  listLiveComments(input: {
    sessionId: string;
    includeHidden?: boolean;
    cursor?: string | null;
    since?: Date | null;
    pageSize?: number | null;
  }) {
    const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 50));
    return this.prisma.liveSessionComment.findMany({
      where: {
        sessionId: input.sessionId,
        ...(input.includeHidden ? {} : { visibility: 'PUBLIC' as const }),
        ...(input.since ? { createdAt: { gt: input.since } } : {}),
      },
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      include: this.liveCommentInclude(),
      orderBy: { createdAt: 'asc' },
      take: pageSize,
    });
  }

  findLiveCommentByClientMessage(input: {
    sessionId: string;
    authorUserId: string;
    clientMessageId: string;
  }) {
    return this.prisma.liveSessionComment.findFirst({
      where: input,
      include: this.liveCommentInclude(),
    });
  }

  async createLiveComment(input: {
    sessionId: string;
    authorUserId: string;
    body: string;
    clientMessageId?: string | null;
  }) {
    if (input.clientMessageId) {
      const existing = await this.findLiveCommentByClientMessage({
        sessionId: input.sessionId,
        authorUserId: input.authorUserId,
        clientMessageId: input.clientMessageId,
      });
      if (existing) return existing;
    }
    return this.prisma.liveSessionComment.create({
      data: input,
      include: this.liveCommentInclude(),
    });
  }

  updateLiveCommentVisibility(input: {
    sessionId: string;
    commentId: string;
    requesterUserId: string;
    visibility: 'PUBLIC' | 'HIDDEN';
  }) {
    return this.prisma.liveSessionComment.update({
      where: { id: input.commentId, sessionId: input.sessionId },
      data: {
        visibility: input.visibility,
        hiddenAt: input.visibility === 'HIDDEN' ? new Date() : null,
        hiddenByUserId:
          input.visibility === 'HIDDEN' ? input.requesterUserId : null,
      },
      include: this.liveCommentInclude(),
    });
  }

  deleteLiveComment(input: { sessionId: string; commentId: string }) {
    return this.prisma.liveSessionComment.delete({
      where: { id: input.commentId, sessionId: input.sessionId },
      include: this.liveCommentInclude(),
    });
  }

  private liveSessionInclude(requesterUserId?: string | null) {
    return {
      shop: { select: { shopName: true, ownerUserId: true } },
      pinnedOffer: {
        include: this.liveOfferInclude(),
      },
      offers: {
        orderBy: { sortOrder: 'asc' as const },
        include: {
          offer: {
            include: this.liveOfferInclude(),
          },
        },
      },
      vouchers: {
        orderBy: { sortOrder: 'asc' as const },
        include: { voucher: true },
      },
      reminders: requesterUserId
        ? { where: { userId: requesterUserId } }
        : false,
      _count: { select: { reminders: true } },
    };
  }

  private liveOfferInclude() {
    return {
      media: {
        include: { mediaAsset: true },
        orderBy: { createdAt: 'desc' as const },
      },
      variants: {
        where: { isActive: true },
        select: { price: true, availableQuantity: true },
      },
    };
  }

  private liveCommentInclude() {
    return {
      author: { select: { displayName: true, email: true, phone: true } },
    };
  }
}
