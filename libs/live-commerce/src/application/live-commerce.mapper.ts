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
type LiveOfferProjection = {
  id: string;
  title: string;
  currency: string;
  offerStatus?: string;
  variants?: Array<{
    price: Prisma.Decimal | number | string | null;
    availableQuantity: number;
  }>;
  media?: Array<{
    mediaType: string;
    fileUrl?: string | null;
    mediaAsset?: { secureUrl?: string | null } | null;
  }>;
};
type LiveSessionWithRelations = {
  id: string;
  shopId: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  pinnedOfferId?: string | null;
  pinnedOffer?: LiveOfferProjection | null;
  startAt: Date;
  status: string;
  playbackUrl: string | null;
  streamProvider?: string | null;
  streamProviderSessionId?: string | null;
  streamIngestUrl?: string | null;
  streamLatencyTargetMs?: number | null;
  providerStatus?: string | null;
  actualStartedAt?: Date | null;
  actualEndedAt?: Date | null;
  recordingUrl?: string | null;
  recordingRetentionDays?: number | null;
  createdAt: Date;
  shop: { shopName: string };
  offers?: Array<{
    offer: LiveOfferProjection;
  }>;
  vouchers?: Array<{
    voucher: {
      id: string;
      code: string;
      name: string;
      discountType: string;
      percentage?: Prisma.Decimal | number | string | null;
      fixedAmount?: Prisma.Decimal | number | string | null;
      maxDiscountAmount?: Prisma.Decimal | number | string | null;
      minOrderAmount: Prisma.Decimal | number | string;
      startsAt: Date;
      endsAt: Date;
      status: string;
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
    pinnedOfferId: session.pinnedOfferId ?? null,
    pinnedOffer: session.pinnedOffer
      ? toOfferResponse(session.pinnedOffer, 'id')
      : null,
    startAt: session.startAt,
    status: session.status,
    playbackUrl:
      session.status === 'ENDED' || session.status === 'CANCELLED'
        ? null
        : session.playbackUrl,
    streamProvider: session.streamProvider ?? null,
    streamLatencyTargetMs: session.streamLatencyTargetMs ?? null,
    providerStatus: session.providerStatus ?? null,
    actualStartedAt: session.actualStartedAt ?? null,
    actualEndedAt: session.actualEndedAt ?? null,
    recordingUrl: null,
    recordingRetentionDays: null,
    reminderCount: session._count?.reminders ?? session.reminders?.length ?? 0,
    viewerHasReminder: Boolean(
      viewerUserId &&
      session.reminders?.some((reminder) => reminder.userId === viewerUserId),
    ),
    offers: (session.offers ?? []).map(({ offer }) =>
      toOfferResponse(offer, 'offerId'),
    ),
    vouchers: (session.vouchers ?? [])
      .filter(({ voucher }) => voucher.status === 'ACTIVE')
      .map(({ voucher }) => ({
        voucherId: voucher.id,
        code: voucher.code,
        name: voucher.name,
        discountType: voucher.discountType,
        percentage: decimalToNumber(voucher.percentage),
        fixedAmount: decimalToNumber(voucher.fixedAmount),
        maxDiscountAmount: decimalToNumber(voucher.maxDiscountAmount),
        minOrderAmount: decimalToNumber(voucher.minOrderAmount),
        startsAt: voucher.startsAt,
        endsAt: voucher.endsAt,
      })),
    createdAt: session.createdAt,
  };
}

function toOfferResponse(
  offer: LiveOfferProjection,
  idField: 'id' | 'offerId',
) {
  const thumbnailMedia =
    offer.media?.find(
      (media) =>
        media.mediaType === 'thumbnail' &&
        (media.mediaAsset?.secureUrl || media.fileUrl),
    ) ??
    offer.media?.find((media) => media.mediaAsset?.secureUrl || media.fileUrl);
  const prices = (offer.variants ?? [])
    .filter((variant) => variant.price !== null)
    .map((variant) => decimalToNumber(variant.price));
  const availableQuantity =
    offer.offerStatus && offer.offerStatus !== 'active'
      ? 0
      : (offer.variants ?? []).reduce(
          (sum, variant) => sum + variant.availableQuantity,
          0,
        );

  return {
    [idField]: offer.id,
    title: offer.title,
    price: prices.length ? Math.min(...prices) : 0,
    currency: offer.currency,
    availableQuantity,
    thumbnailUrl:
      thumbnailMedia?.mediaAsset?.secureUrl ?? thumbnailMedia?.fileUrl ?? null,
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
