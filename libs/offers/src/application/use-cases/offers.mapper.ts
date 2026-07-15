import { Offer, Prisma } from '@prisma/client';

type OfferWithRelations = any;
type LegacyOfferWithRelations = Offer & {
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
    displayName: string;
    values: Array<{
      id: string;
      text: string;
      sortOrder: number;
      mediaAsset: { id: string; secureUrl: string } | null;
    }>;
  }>;
  variants?: OfferDetailVariantWithRelations[];
};

type OfferDetailVariantWithRelations = {
  id: string;
  sku: string | null;
  price?: Prisma.Decimal | number | string | null;
  availableQuantity: number;
  isActive: boolean;
  mediaAsset?: { id: string; secureUrl: string } | null;
  values?: Array<{ optionValueId: string }>;
};

type OfferVariantWithRelations = {
  id: string;
  offerId: string;
  sku: string | null;
  price: Prisma.Decimal | number | string | null;
  availableQuantity: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  mediaAsset: { id: string; secureUrl: string } | null;
  values: Array<{
    optionValue: {
      id: string;
      text: string;
      sortOrder?: number;
      optionGroup: {
        id: string;
        displayName: string;
      };
    };
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
  const activeVariants = (offer.variants ?? []).filter((variant) => variant.isActive);
  const variantPrices = activeVariants
    .map((variant) => decimalToNumber(variant.price))
    .filter((price): price is number => price !== null);
  const price = variantPrices.length > 0 ? Math.min(...variantPrices) : null;
  const availableQuantity = activeVariants.reduce(
    (sum, variant) => sum + variant.availableQuantity,
    0,
  );
  const allocatedQuantity =
    offer.batchLinks?.reduce((sum, link) => sum + link.allocatedQuantity, 0) ??
    availableQuantity;
  const soldQuantity = Math.max(allocatedQuantity - availableQuantity, 0);

  return {
    id: offer.id,
    title: offer.title,
    description: offer.description,
    price,
    currency: offer.currency,
    itemCondition: offer.itemCondition,
    availableQuantity,
    soldQuantity,
    parcelWeightGrams: offer.parcelWeightGrams ?? null,
    parcelLengthCm: offer.parcelLengthCm ?? null,
    parcelWidthCm: offer.parcelWidthCm ?? null,
    parcelHeightCm: offer.parcelHeightCm ?? null,
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
      displayName: group.displayName,
      values: group.values.map((value) => ({
        id: value.id,
        text: value.text,
        mediaAsset: value.mediaAsset
          ? { id: value.mediaAsset.id, secureUrl: value.mediaAsset.secureUrl }
          : null,
      })),
    })),
    variants: (offer.variants ?? []).map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      price: variant.price == null ? null : decimalToNumber(variant.price),
      availableQuantity: variant.availableQuantity,
      isActive: variant.isActive,
      optionValueIds: (variant.values ?? []).map((value) => value.optionValueId),
      mediaAsset: variant.mediaAsset
        ? {
            id: variant.mediaAsset.id,
            secureUrl: variant.mediaAsset.secureUrl,
          }
        : null,
    })),
    createdAt: offer.createdAt,
  };
}

export function toOfferVariantResponse(variant: OfferVariantWithRelations) {
  return {
    id: variant.id,
    offerId: variant.offerId,
    sku: variant.sku,
    priceOverride:
      variant.price === null ? null : decimalToNumber(variant.price),
    availableQuantity: variant.availableQuantity,
    mediaAsset: variant.mediaAsset
      ? { id: variant.mediaAsset.id, secureUrl: variant.mediaAsset.secureUrl }
      : null,
    isActive: variant.isActive,
    optionValues: [...variant.values]
      .sort((left, right) => {
        const groupOrder =
          left.optionValue.optionGroup.displayName.localeCompare(
            right.optionValue.optionGroup.displayName,
          );
        return (
          groupOrder ||
          (left.optionValue.sortOrder ?? 0) - (right.optionValue.sortOrder ?? 0)
        );
      })
      .map(({ optionValue }) => ({
        id: optionValue.id,
        text: optionValue.text,
        optionGroup: {
          id: optionValue.optionGroup.id,
          displayName: optionValue.optionGroup.displayName,
        },
      })),
    createdAt: variant.createdAt,
    updatedAt: variant.updatedAt,
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
