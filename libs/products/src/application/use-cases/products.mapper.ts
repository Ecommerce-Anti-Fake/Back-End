import { Offer, Prisma } from '@prisma/client';

type BrandRecord = {
  id: string;
  name: string;
  registryStatus: string;
  createdAt: Date;
};

type CategoryRecord = {
  id: string;
  parentId: string | null;
  name: string;
  riskTier: string;
};

type OfferWithRelations = Offer & {
  shop: {
    shopName: string;
    registrationType: string;
  };
  category: {
    name: string;
  };
  distributionNode?: {
    networkId: string;
  } | null;
  media?: Array<{
    mediaType?: string;
    fileUrl: string;
    mediaAsset?: {
      secureUrl: string;
    } | null;
  }>;
  batchLinks?: Array<{
    allocatedQuantity: number;
  }>;
  parcelWeightGrams?: number | null;
  parcelLengthCm?: number | null;
  parcelWidthCm?: number | null;
  parcelHeightCm?: number | null;
  shippingMethods?: Array<{
    providerCode: string;
    providerName: string;
    shippingFee: Prisma.Decimal | number;
    estimatedDays: string | null;
    isEnabled: boolean;
  }>;
};

type OfferMediaWithAsset = {
  id: string;
  offerId: string;
  mediaAssetId: string | null;
  mediaType: string;
  fileUrl: string;
  phash: string | null;
  createdAt: Date;
  mediaAsset?: {
    assetType: 'IMAGE' | 'VIDEO' | 'RAW';
    mimeType: string | null;
    publicId: string | null;
    secureUrl: string;
  } | null;
};

type OfferDocumentWithAsset = {
  id: string;
  offerId: string;
  mediaAssetId: string | null;
  docType: string;
  fileUrl: string;
  issuerName: string | null;
  reviewStatus: string;
  uploadedAt: Date;
  mediaAsset?: {
    mimeType: string | null;
    publicId: string | null;
    secureUrl: string;
  } | null;
};

type ReviewMediaWithAsset = {
  id: string;
  reviewId: string;
  mediaAssetId: string | null;
  fileUrl: string;
  mimeType: string | null;
  publicId: string | null;
  createdAt: Date;
  mediaAsset?: {
    assetType: 'IMAGE' | 'VIDEO' | 'RAW';
    mimeType: string | null;
    publicId: string | null;
    secureUrl: string;
  } | null;
};

type OfferBatchLinkWithBatch = {
  id: string;
  offerId: string;
  batchId: string;
  allocatedQuantity: number;
  createdAt: Date;
  batch: {
    batchNumber: string;
    quantity: number;
    sourceName: string;
    countryOfOrigin: string;
    sourceType: string;
    sourceOrderId: string | null;
    sourceOrderItemId: string | null;
    receivedAt: Date;
  };
};

type ReviewWithAuthor = {
  id: string;
  orderId: string;
  orderItemId?: string | null;
  rating: number;
  comment: string | null;
  createdAt: Date;
  orderItem?: {
    offerId: string;
  } | null;
  fromUser: {
    displayName: string | null;
    email: string | null;
    phone: string | null;
  };
  media?: ReviewMediaWithAsset[];
};

type ChatUserRecord = {
  displayName: string | null;
  email: string | null;
  phone: string | null;
};

type ChatMessageWithSender = {
  id: string;
  threadId: string;
  senderUserId: string;
  clientMessageId?: string | null;
  messageType: string;
  body: string;
  sentAt: Date;
  sender: ChatUserRecord;
};

type ChatThreadWithRelations = {
  id: string;
  shopId: string;
  buyerUserId: string;
  sellerUserId: string;
  createdAt: Date;
  shop: {
    shopName: string;
  };
  buyer: ChatUserRecord;
  seller: ChatUserRecord;
  messages?: ChatMessageWithSender[];
};

type SocialUserRecord = {
  displayName: string | null;
  email: string | null;
  phone: string | null;
};

type SocialCommentWithAuthor = {
  id: string;
  postId: string;
  authorUserId: string;
  body: string;
  visibility: string;
  createdAt: Date;
  author: SocialUserRecord;
};

type SocialPostWithRelations = {
  id: string;
  authorUserId: string;
  authorShopId: string | null;
  offerId: string | null;
  postType: string;
  body: string;
  visibility: string;
  createdAt: Date;
  author: SocialUserRecord;
  authorShop?: { shopName: string } | null;
  comments?: SocialCommentWithAuthor[];
  reactions?: Array<{ userId: string; reactionType: string }>;
  _count?: {
    comments?: number;
    reactions?: number;
    shares?: number;
  };
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
  author: SocialUserRecord;
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
  shop: {
    shopName: string;
  };
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
        mediaAsset?: {
          secureUrl?: string | null;
        } | null;
      }>;
    };
  }>;
  reminders?: Array<{ userId: string }>;
  _count?: {
    reminders?: number;
  };
};

export function toBrandResponse(brand: BrandRecord) {
  return {
    id: brand.id,
    name: brand.name,
    registryStatus: brand.registryStatus,
    createdAt: brand.createdAt,
  };
}

export function toCategoryResponse(category: CategoryRecord) {
  return {
    id: category.id,
    parentId: category.parentId,
    name: category.name,
    riskTier: category.riskTier,
  };
}

export function toShippingCarrierResponse(carrier: {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
}) {
  return {
    providerCode: carrier.code,
    providerName: carrier.name,
    isIntegrated: carrier.code !== 'SELF_DELIVERY',
    description: carrier.description,
    isActive: carrier.isActive,
    sortOrder: carrier.sortOrder,
  };
}

export function toOfferResponse(offer: OfferWithRelations) {
  const thumbnailMedia =
    offer.media?.find((media) => media.mediaType === 'thumbnail' && (media.mediaAsset?.secureUrl || media.fileUrl)) ??
    offer.media?.find((media) => media.mediaAsset?.secureUrl || media.fileUrl);
  const imageUrls = offerImageUrls(offer.media);
  const allocatedQuantity = offer.batchLinks?.reduce((sum, link) => sum + link.allocatedQuantity, 0) ?? offer.availableQuantity;
  const soldQuantity = Math.max(allocatedQuantity - offer.availableQuantity, 0);

  return {
    id: offer.id,
    title: offer.title,
    description: offer.description,
    price: decimalToNumber(offer.price),
    currency: offer.currency,
    salesMode: offer.salesMode,
    minWholesaleQty: offer.minWholesaleQty,
    itemCondition: offer.itemCondition,
    availableQuantity: offer.availableQuantity,
    soldQuantity,
    parcelWeightGrams: offer.parcelWeightGrams ?? null,
    parcelLengthCm: offer.parcelLengthCm ?? null,
    parcelWidthCm: offer.parcelWidthCm ?? null,
    parcelHeightCm: offer.parcelHeightCm ?? null,
    verificationLevel: offer.verificationLevel,
    offerStatus: offer.offerStatus,
    shopId: offer.shopId,
    categoryId: offer.categoryId,
    brandId: offer.brandId,
    gtin: offer.gtin ?? null,
    verificationPolicy: offer.verificationPolicy,
    distributionNodeId: offer.distributionNodeId,
    distributionNetworkId: offer.distributionNode?.networkId ?? null,
    shopName: offer.shop.shopName,
    shopType: offer.shop.registrationType,
    categoryName: offer.category.name,
    productModelName: offer.modelName,
    thumbnailUrl: thumbnailMedia?.mediaAsset?.secureUrl ?? thumbnailMedia?.fileUrl ?? null,
    imageUrls,
    shippingMethods: (offer.shippingMethods ?? []).map((method) => ({
      providerCode: method.providerCode,
      providerName: method.providerName,
      shippingFee: decimalToNumber(method.shippingFee),
      estimatedDays: method.estimatedDays,
      isEnabled: method.isEnabled,
    })),
    createdAt: offer.createdAt,
  };
}

function offerImageUrls(media: OfferWithRelations['media']) {
  const seen = new Set<string>();
  return [...(media ?? [])]
    .sort((left, right) => {
      if (left.mediaType === 'thumbnail' && right.mediaType !== 'thumbnail') return -1;
      if (right.mediaType === 'thumbnail' && left.mediaType !== 'thumbnail') return 1;
      return 0;
    })
    .flatMap((item) => {
      const url = (item.mediaAsset?.secureUrl ?? item.fileUrl ?? '').trim();
      if (!url || seen.has(url)) {
        return [];
      }
      seen.add(url);
      return [url];
    });
}

export function toChatThreadResponse(thread: ChatThreadWithRelations) {
  const messages = (thread.messages ?? []).map(toChatMessageResponse);

  return {
    id: thread.id,
    shopId: thread.shopId,
    shopName: thread.shop.shopName,
    buyerUserId: thread.buyerUserId,
    buyerName: chatDisplayName(thread.buyer),
    sellerUserId: thread.sellerUserId,
    sellerName: chatDisplayName(thread.seller),
    lastMessage: messages.at(-1) ?? null,
    messages,
    createdAt: thread.createdAt,
  };
}

export function toChatMessageResponse(message: ChatMessageWithSender) {
  return {
    id: message.id,
    threadId: message.threadId,
    senderUserId: message.senderUserId,
    clientMessageId: message.clientMessageId ?? null,
    senderName: chatDisplayName(message.sender),
    messageType: message.messageType,
    body: message.body,
    sentAt: message.sentAt,
  };
}

export function toSocialPostResponse(post: SocialPostWithRelations, viewerUserId?: string | null) {
  return {
    id: post.id,
    authorUserId: post.authorUserId,
    authorShopId: post.authorShopId,
    authorName: displayName(post.author),
    authorShopName: post.authorShop?.shopName ?? null,
    offerId: post.offerId,
    postType: post.postType,
    body: post.body,
    visibility: post.visibility,
    reactionCount: post._count?.reactions ?? post.reactions?.length ?? 0,
    commentCount: post._count?.comments ?? post.comments?.length ?? 0,
    shareCount: post._count?.shares ?? 0,
    viewerHasLiked: Boolean(
      viewerUserId && post.reactions?.some((reaction) => reaction.userId === viewerUserId && reaction.reactionType === 'LIKE'),
    ),
    comments: (post.comments ?? []).map(toSocialCommentResponse),
    createdAt: post.createdAt,
  };
}

export function toSocialCommentResponse(comment: SocialCommentWithAuthor) {
  return {
    id: comment.id,
    postId: comment.postId,
    authorUserId: comment.authorUserId,
    authorName: displayName(comment.author),
    body: comment.body,
    visibility: comment.visibility,
    createdAt: comment.createdAt,
  };
}

export function toLiveSessionResponse(session: LiveSessionWithRelations, viewerUserId?: string | null) {
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
    viewerHasReminder: Boolean(viewerUserId && session.reminders?.some((reminder) => reminder.userId === viewerUserId)),
    offers: (session.offers ?? []).map(({ offer }) => {
      const thumbnailMedia =
        offer.media?.find((media) => media.mediaType === 'thumbnail' && (media.mediaAsset?.secureUrl || media.fileUrl)) ??
        offer.media?.find((media) => media.mediaAsset?.secureUrl || media.fileUrl);

      return {
        offerId: offer.id,
        title: offer.title,
        price: decimalToNumber(offer.price),
        currency: offer.currency,
        availableQuantity: offer.availableQuantity,
        thumbnailUrl: thumbnailMedia?.mediaAsset?.secureUrl ?? thumbnailMedia?.fileUrl ?? null,
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

function displayName(user: SocialUserRecord) {
  return user.displayName || user.email || user.phone || 'Nguoi dung ACF';
}

export function toOfferMediaResponse(media: OfferMediaWithAsset) {
  return {
    id: media.id,
    offerId: media.offerId,
    mediaAssetId: media.mediaAssetId,
    mediaType: media.mediaType,
    fileUrl: media.mediaAsset?.secureUrl ?? media.fileUrl,
    phash: media.phash,
    assetType: media.mediaAsset?.assetType ?? 'RAW',
    mimeType: media.mediaAsset?.mimeType ?? null,
    publicId: media.mediaAsset?.publicId ?? null,
    createdAt: media.createdAt,
  };
}

export function toOfferReviewResponse(review: ReviewWithAuthor) {
  const media = (review.media ?? []).map(toReviewMediaResponse);

  return {
    id: review.id,
    orderId: review.orderId,
    orderItemId: review.orderItemId ?? null,
    offerId: review.orderItem?.offerId ?? null,
    rating: review.rating,
    comment: review.comment,
    authorName: review.fromUser.displayName || review.fromUser.email || review.fromUser.phone || 'Người mua đã xác minh',
    verifiedPurchase: true,
    hasImage: media.length > 0,
    media,
    createdAt: review.createdAt,
  };
}

export function toReviewMediaResponse(media: ReviewMediaWithAsset) {
  return {
    id: media.id,
    reviewId: media.reviewId,
    mediaAssetId: media.mediaAssetId,
    fileUrl: media.mediaAsset?.secureUrl ?? media.fileUrl,
    assetType: media.mediaAsset?.assetType ?? 'IMAGE',
    mimeType: media.mediaAsset?.mimeType ?? media.mimeType,
    publicId: media.mediaAsset?.publicId ?? media.publicId,
    createdAt: media.createdAt,
  };
}

export function toOfferDocumentResponse(document: OfferDocumentWithAsset) {
  return {
    id: document.id,
    offerId: document.offerId,
    mediaAssetId: document.mediaAssetId,
    docType: document.docType,
    fileUrl: document.mediaAsset?.secureUrl ?? document.fileUrl,
    issuerName: document.issuerName,
    reviewStatus: document.reviewStatus,
    mimeType: document.mediaAsset?.mimeType ?? null,
    publicId: document.mediaAsset?.publicId ?? null,
    uploadedAt: document.uploadedAt,
  };
}

export function toOfferBatchLinkResponse(link: OfferBatchLinkWithBatch) {
  return {
    id: link.id,
    offerId: link.offerId,
    batchId: link.batchId,
    allocatedQuantity: link.allocatedQuantity,
    batchNumber: link.batch.batchNumber,
    batchQuantity: link.batch.quantity,
    sourceName: link.batch.sourceName,
    countryOfOrigin: link.batch.countryOfOrigin,
    sourceType: link.batch.sourceType,
    sourceOrderId: link.batch.sourceOrderId,
    sourceOrderItemId: link.batch.sourceOrderItemId,
    receivedAt: link.batch.receivedAt,
    createdAt: link.createdAt,
  };
}

function decimalToNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value.toString());
}

function chatDisplayName(user: ChatUserRecord) {
  return user.displayName || user.email || user.phone || 'Nguoi dung';
}
