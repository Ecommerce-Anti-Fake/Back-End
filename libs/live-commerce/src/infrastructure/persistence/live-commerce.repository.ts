import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma/prisma.service';

@Injectable()
export class LiveCommerceRepository {
  constructor(private readonly prisma: PrismaService) {}

  listLiveSessions(input: {
    requesterUserId?: string | null;
    filter?: 'all' | 'live' | 'upcoming';
    q?: string | null;
    shopId?: string | null;
  }) {
    const now = new Date();
    const search = input.q?.trim();
    const statusWhere =
      input.filter === 'live'
        ? { status: 'LIVE' as const }
        : input.filter === 'upcoming'
          ? { status: 'SCHEDULED' as const, startAt: { gte: now } }
          : { status: { not: 'CANCELLED' as const } };
    return this.prisma.liveCommerceSession.findMany({
      where: {
        ...statusWhere,
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
      },
      include: this.liveSessionInclude(input.requesterUserId),
      orderBy: [{ status: 'asc' }, { startAt: 'asc' }],
      take: 50,
    });
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

  findLiveSessionByProviderId(providerSessionId: string) {
    return this.prisma.liveCommerceSession.findUnique({
      where: { streamProviderSessionId: providerSessionId },
      include: this.liveSessionInclude(),
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

  updateLiveProviderState(input: {
    sessionId: string;
    status?: 'LIVE' | 'ENDED';
    providerStatus: string;
    actualStartedAt?: Date;
    actualEndedAt?: Date;
    providerEventAt: Date;
    providerEventType: string;
    providerErrorCode?: string | null;
    providerErrorMessage?: string | null;
    recordingUrl?: string;
  }) {
    return this.prisma.liveCommerceSession.update({
      where: { id: input.sessionId },
      data: {
        ...(input.status ? { status: input.status } : {}),
        providerStatus: input.providerStatus,
        providerEventAt: input.providerEventAt,
        providerEventType: input.providerEventType,
        ...(input.providerErrorCode !== undefined
          ? { providerErrorCode: input.providerErrorCode }
          : {}),
        ...(input.providerErrorMessage !== undefined
          ? { providerErrorMessage: input.providerErrorMessage }
          : {}),
        ...(input.actualStartedAt
          ? { actualStartedAt: input.actualStartedAt }
          : {}),
        ...(input.actualEndedAt ? { actualEndedAt: input.actualEndedAt } : {}),
        ...(input.recordingUrl ? { recordingUrl: input.recordingUrl } : {}),
      },
      include: this.liveSessionInclude(),
    });
  }

  updateLiveSessionStatus(input: {
    sessionId: string;
    status: 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED';
    requesterUserId: string;
  }) {
    return this.prisma.liveCommerceSession.update({
      where: { id: input.sessionId },
      data: { status: input.status },
      include: this.liveSessionInclude(input.requesterUserId),
    });
  }

  async remindLiveSession(input: { sessionId: string; userId: string }) {
    await this.prisma.liveSessionReminder.upsert({
      where: {
        sessionId_userId: { sessionId: input.sessionId, userId: input.userId },
      },
      create: input,
      update: {},
    });
    return this.findLiveSessionById(input.sessionId, input.userId);
  }

  async listLiveReminderUserIds(sessionId: string) {
    const reminders = await this.prisma.liveSessionReminder.findMany({
      where: { sessionId },
      select: { userId: true },
    });
    return reminders.map((reminder) => reminder.userId);
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
      offers: {
        orderBy: { sortOrder: 'asc' as const },
        include: {
          offer: {
            include: {
              media: {
                include: { mediaAsset: true },
                orderBy: { createdAt: 'desc' as const },
              },
              variants: {
                where: { isActive: true },
                select: { price: true, availableQuantity: true },
              },
            },
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

  private liveCommentInclude() {
    return {
      author: { select: { displayName: true, email: true, phone: true } },
    };
  }
}
