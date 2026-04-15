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
