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
type ReviewWithAuthor = {
  id: string;
  orderId: string;
  orderItemId?: string | null;
  rating: number;
  comment: string | null;
  createdAt: Date;
  orderItem?: { offerId: string } | null;
  fromUser: {
    displayName: string | null;
    email: string | null;
    phone: string | null;
  };
  media?: ReviewMediaWithAsset[];
};

type OfferReviewListRecord = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  fromUser: { displayName: string | null };
  media: Array<{
    fileUrl: string;
    mediaAsset: { secureUrl: string } | null;
  }>;
};

export function toOfferReviewListItemResponse(review: OfferReviewListRecord) {
  return {
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    authorName: review.fromUser.displayName || 'Nguoi mua da xac minh',
    media: review.media.map((item) => ({
      fileUrl: item.mediaAsset?.secureUrl ?? item.fileUrl,
    })),
    createdAt: review.createdAt.toISOString(),
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
    authorName:
      review.fromUser.displayName ||
      review.fromUser.email ||
      review.fromUser.phone ||
      'Người mua đã xác minh',
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
