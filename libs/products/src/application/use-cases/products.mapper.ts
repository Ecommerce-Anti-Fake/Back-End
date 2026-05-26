import { Offer, Prisma, ProductModel } from '@prisma/client';

type ProductModelWithBrand = ProductModel & {
  brand: {
    name: string;
  };
  category: {
    name: string;
  };
};

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
  productModel: {
    modelName: string;
    brandId: string;
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
    productModelId: string;
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

export function toProductModelResponse(model: ProductModelWithBrand) {
  return {
    id: model.id,
    modelName: model.modelName,
    gtin: model.gtin,
    verificationPolicy: model.verificationPolicy,
    approvalStatus: model.approvalStatus,
    brandName: model.brand.name,
    categoryId: model.categoryId,
    categoryName: model.category.name,
    createdAt: model.createdAt,
  };
}

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

export function toOfferResponse(offer: OfferWithRelations) {
  const thumbnailMedia =
    offer.media?.find((media) => media.mediaType === 'thumbnail' && (media.mediaAsset?.secureUrl || media.fileUrl)) ??
    offer.media?.find((media) => media.mediaAsset?.secureUrl || media.fileUrl);

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
    verificationLevel: offer.verificationLevel,
    offerStatus: offer.offerStatus,
    shopId: offer.shopId,
    categoryId: offer.categoryId,
    productModelId: offer.productModelId,
    brandId: offer.productModel.brandId ?? null,
    distributionNodeId: offer.distributionNodeId,
    distributionNetworkId: offer.distributionNode?.networkId ?? null,
    shopName: offer.shop.shopName,
    shopType: offer.shop.registrationType,
    categoryName: offer.category.name,
    productModelName: offer.productModel.modelName,
    thumbnailUrl: thumbnailMedia?.mediaAsset?.secureUrl ?? thumbnailMedia?.fileUrl ?? null,
    createdAt: offer.createdAt,
  };
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
    senderName: chatDisplayName(message.sender),
    messageType: message.messageType,
    body: message.body,
    sentAt: message.sentAt,
  };
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
    productModelId: link.batch.productModelId,
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

function decimalToNumber(value: Prisma.Decimal) {
  return Number(value.toString());
}

function chatDisplayName(user: ChatUserRecord) {
  return user.displayName || user.email || user.phone || 'Nguoi dung';
}
