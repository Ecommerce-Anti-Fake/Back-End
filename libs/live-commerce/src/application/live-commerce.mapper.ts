import { Prisma } from '@prisma/client';

type UserDisplayRecord = {
  displayName: string | null;
  email: string | null;
  phone: string | null;
};
type LiveCommentWithAuthor = {
  id: string;
  sessionId: string;
  authorUserId: string;
  body: string;
  visibility: string;
  clientMessageId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  author: UserDisplayRecord;
};
type LiveSessionWithRelations = {
  id: string;
  shopId: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  startAt: Date;
  status: string;
  playbackUrl: string | null;
  streamProvider?: string | null;
  streamProviderSessionId?: string | null;
  streamIngestUrl?: string | null;
  streamLatencyTargetMs?: number | null;
  recordingUrl?: string | null;
  recordingRetentionDays?: number | null;
  createdAt: Date;
  shop: { shopName: string };
  offers?: Array<{
    offer: {
      id: string;
      title: string;
      price: Prisma.Decimal | number | string | null;
      currency: string;
      availableQuantity: number;
      media?: Array<{
        mediaType: string;
        fileUrl?: string | null;
        mediaAsset?: { secureUrl?: string | null } | null;
      }>;
    };
  }>;
  reminders?: Array<{ userId: string }>;
  _count?: { reminders?: number };
};

export function toLiveSessionResponse(
  session: LiveSessionWithRelations,
  viewerUserId?: string | null,
) {
  return {
    id: session.id,
    shopId: session.shopId,
    shopName: session.shop.shopName,
    title: session.title,
    description: session.description,
    coverUrl: session.coverUrl,
    startAt: session.startAt,
    status: session.status,
    playbackUrl: session.playbackUrl,
    streamProvider: session.streamProvider ?? null,
    streamProviderSessionId: session.streamProviderSessionId ?? null,
    streamIngestUrl: session.streamIngestUrl ?? null,
    streamLatencyTargetMs: session.streamLatencyTargetMs ?? null,
    recordingUrl: session.recordingUrl ?? null,
    recordingRetentionDays: session.recordingRetentionDays ?? null,
    reminderCount: session._count?.reminders ?? session.reminders?.length ?? 0,
    viewerHasReminder: Boolean(
      viewerUserId &&
      session.reminders?.some((reminder) => reminder.userId === viewerUserId),
    ),
    offers: (session.offers ?? []).map(({ offer }) => {
      const thumbnailMedia =
        offer.media?.find(
          (media) =>
            media.mediaType === 'thumbnail' &&
            (media.mediaAsset?.secureUrl || media.fileUrl),
        ) ??
        offer.media?.find(
          (media) => media.mediaAsset?.secureUrl || media.fileUrl,
        );
      return {
        offerId: offer.id,
        title: offer.title,
        price: decimalToNumber(offer.price),
        currency: offer.currency,
        availableQuantity: offer.availableQuantity,
        thumbnailUrl:
          thumbnailMedia?.mediaAsset?.secureUrl ??
          thumbnailMedia?.fileUrl ??
          null,
      };
    }),
    createdAt: session.createdAt,
  };
}

export function toLiveCommentResponse(comment: LiveCommentWithAuthor) {
  return {
    id: comment.id,
    sessionId: comment.sessionId,
    authorUserId: comment.authorUserId,
    authorName: displayName(comment.author),
    body: comment.body,
    visibility: comment.visibility,
    clientMessageId: comment.clientMessageId ?? null,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
  };
}

function displayName(user: UserDisplayRecord) {
  return user.displayName || user.email || user.phone || 'Nguoi dung ACF';
}

function decimalToNumber(
  value: Prisma.Decimal | number | string | null | undefined,
) {
  return value === null || value === undefined ? 0 : Number(value.toString());
}
