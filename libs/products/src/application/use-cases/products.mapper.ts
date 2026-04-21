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
  };
  category: {
    name: string;
  };
  productModel: {
    modelName: string;
  };
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
  };
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
    shopName: offer.shop.shopName,
    categoryName: offer.category.name,
    productModelName: offer.productModel.modelName,
    createdAt: offer.createdAt,
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
    createdAt: link.createdAt,
  };
}

function decimalToNumber(value: Prisma.Decimal) {
  return Number(value.toString());
}
