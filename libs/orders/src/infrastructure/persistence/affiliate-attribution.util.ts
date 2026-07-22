import { Prisma } from '@prisma/client';

export type AffiliateAttributionItem = {
  offerId: string;
  sellerShopId: string;
  brandId: string;
  grossAmount: Prisma.Decimal.Value;
  shopProductDiscountAmount: Prisma.Decimal.Value;
};

export function calculateAffiliateCommissionBase(
  program: {
    scopeType: 'PLATFORM' | 'SHOP' | 'BRAND' | 'OFFER';
    ownerShopId?: string | null;
    brandId?: string | null;
    offerId?: string | null;
  },
  items: AffiliateAttributionItem[],
): Prisma.Decimal {
  return items.reduce((total, item) => {
    const eligible =
      (program.scopeType === 'SHOP' && program.ownerShopId === item.sellerShopId) ||
      (program.scopeType === 'BRAND' &&
        program.ownerShopId === item.sellerShopId &&
        program.brandId === item.brandId) ||
      (program.scopeType === 'OFFER' && program.offerId === item.offerId);
    if (!eligible) {
      return total;
    }

    return total.plus(
      Prisma.Decimal.max(
        new Prisma.Decimal(item.grossAmount).minus(item.shopProductDiscountAmount),
        0,
      ),
    );
  }, new Prisma.Decimal(0));
}
