import { Offer, Prisma, ProductModel } from '@prisma/client';

type ProductModelWithBrand = ProductModel & {
  brand: {
    name: string;
  };
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

export function toProductModelResponse(model: ProductModelWithBrand) {
  return {
    id: model.id,
    modelName: model.modelName,
    gtin: model.gtin,
    verificationPolicy: model.verificationPolicy,
    approvalStatus: model.approvalStatus,
    brandName: model.brand.name,
    createdAt: model.createdAt,
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

function decimalToNumber(value: Prisma.Decimal) {
  return Number(value.toString());
}
