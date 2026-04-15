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

function decimalToNumber(value: Prisma.Decimal) {
  return Number(value.toString());
}
