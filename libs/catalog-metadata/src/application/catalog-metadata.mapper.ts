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
