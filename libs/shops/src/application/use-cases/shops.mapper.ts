type ShopWithCategories = {
  id: string;
  ownerUserId: string;
  shopName: string;
  registrationType: string;
  businessType: string;
  taxCode: string | null;
  shopStatus: string;
  createdAt: Date;
  registeredCategories?: Array<{
    registrationStatus: string;
    category: {
      id: string;
      name: string;
    };
  }>;
};

export function toShopResponse(shop: ShopWithCategories) {
  return {
    id: shop.id,
    ownerUserId: shop.ownerUserId,
    shopName: shop.shopName,
    registrationType: shop.registrationType,
    businessType: shop.businessType,
    taxCode: shop.taxCode,
    shopStatus: shop.shopStatus,
    createdAt: shop.createdAt,
    registeredCategories: (shop.registeredCategories ?? []).map((item) => ({
      categoryId: item.category.id,
      categoryName: item.category.name,
      registrationStatus: item.registrationStatus,
    })),
  };
}

export function toBrandAuthorizationResponse(authorization: {
  id: string;
  shopId: string;
  brandId: string;
  mediaAssetId: string | null;
  authorizationType: string;
  fileUrl: string | null;
  verificationStatus: string;
  reviewNote: string | null;
  verifiedAt: Date | null;
  createdAt: Date;
  mediaAsset?: {
    mimeType: string | null;
    publicId: string | null;
    secureUrl: string;
  } | null;
  brand?: {
    name: string;
  } | null;
  shop?: {
    shopName: string;
    registrationType: string;
  } | null;
}) {
  return {
    id: authorization.id,
    shopId: authorization.shopId,
    brandId: authorization.brandId,
    mediaAssetId: authorization.mediaAssetId,
    authorizationType: authorization.authorizationType,
    fileUrl: authorization.mediaAsset?.secureUrl ?? authorization.fileUrl,
    verificationStatus: authorization.verificationStatus,
    reviewNote: authorization.reviewNote,
    verifiedAt: authorization.verifiedAt,
    createdAt: authorization.createdAt,
    mimeType: authorization.mediaAsset?.mimeType ?? null,
    publicId: authorization.mediaAsset?.publicId ?? null,
    brandName: authorization.brand?.name ?? null,
    shopName: authorization.shop?.shopName ?? null,
    shopRegistrationType: authorization.shop?.registrationType ?? null,
  };
}
