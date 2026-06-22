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
    thumbnailUrl:
      thumbnailMedia?.mediaAsset?.secureUrl ?? thumbnailMedia?.fileUrl ?? null,
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
