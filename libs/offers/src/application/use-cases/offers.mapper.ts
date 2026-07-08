import { Offer, Prisma } from '@prisma/client';

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
  optionGroups?: Array<{
    id: string;
    name: string;
    displayName: string;
    sortOrder: number;
    values: Array<{
      id: string;
      text: string;
      sortOrder: number;
      mediaAsset: { id: string; secureUrl: string } | null;
    }>;
  }>;
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

export function toOfferResponse(offer: OfferWithRelations) {
  const thumbnailMedia =
    offer.media?.find(
      (media) =>
        media.mediaType === 'thumbnail' &&
        (media.mediaAsset?.secureUrl || media.fileUrl),
    ) ??
    offer.media?.find((media) => media.mediaAsset?.secureUrl || media.fileUrl);
  const imageUrls = offerImageUrls(offer.media);
  const allocatedQuantity =
    offer.batchLinks?.reduce((sum, link) => sum + link.allocatedQuantity, 0) ??
    offer.availableQuantity;
  const soldQuantity = Math.max(allocatedQuantity - offer.availableQuantity, 0);

  return {
    id: offer.id,
    title: offer.title,
    description: offer.description,
    price: decimalToNumber(offer.price),
    currency: offer.currency,
    itemCondition: offer.itemCondition,
    availableQuantity: offer.availableQuantity,
    soldQuantity,
    parcelWeightGrams: offer.parcelWeightGrams ?? null,
    parcelLengthCm: offer.parcelLengthCm ?? null,
    parcelWidthCm: offer.parcelWidthCm ?? null,
    parcelHeightCm: offer.parcelHeightCm ?? null,
    verificationLevel: offer.verificationLevel,
    offerStatus: offer.offerStatus,
    moderationStatus: offer.moderationStatus,
    moderationReason: offer.moderationReason ?? null,
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
    thumbnailUrl:
      thumbnailMedia?.mediaAsset?.secureUrl ?? thumbnailMedia?.fileUrl ?? null,
    imageUrls,
    optionGroups: (offer.optionGroups ?? []).map((group) => ({
      id: group.id,
      name: group.name,
      displayName: group.displayName,
      sortOrder: group.sortOrder,
      values: group.values.map((value) => ({
        id: value.id,
        text: value.text,
        sortOrder: value.sortOrder,
        mediaAsset: value.mediaAsset
          ? { id: value.mediaAsset.id, secureUrl: value.mediaAsset.secureUrl }
          : null,
      })),
    })),
    createdAt: offer.createdAt,
  };
}

function offerImageUrls(media: OfferWithRelations['media']) {
  const seen = new Set<string>();
  return [...(media ?? [])]
    .sort((left, right) => {
      if (left.mediaType === 'thumbnail' && right.mediaType !== 'thumbnail')
        return -1;
      if (right.mediaType === 'thumbnail' && left.mediaType !== 'thumbnail')
        return 1;
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

function decimalToNumber(
  value: Prisma.Decimal | number | string | null | undefined,
) {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value.toString());
}
