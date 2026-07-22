import { Prisma } from '@prisma/client';
import { calculateAffiliateCommissionBase } from './affiliate-attribution.util';

describe('calculateAffiliateCommissionBase', () => {
  const items = [
    {
      offerId: 'offer-a',
      sellerShopId: 'shop-a',
      brandId: 'brand-a',
      grossAmount: new Prisma.Decimal('100000'),
      shopProductDiscountAmount: new Prisma.Decimal('10000'),
    },
    {
      offerId: 'offer-b',
      sellerShopId: 'shop-a',
      brandId: 'brand-b',
      grossAmount: new Prisma.Decimal('50000'),
      shopProductDiscountAmount: new Prisma.Decimal('5000'),
    },
    {
      offerId: 'offer-c',
      sellerShopId: 'shop-b',
      brandId: 'brand-a',
      grossAmount: new Prisma.Decimal('80000'),
      shopProductDiscountAmount: new Prisma.Decimal('0'),
    },
  ];

  it.each([
    ['SHOP', { ownerShopId: 'shop-a' }, '135000'],
    ['BRAND', { ownerShopId: 'shop-a', brandId: 'brand-a' }, '90000'],
    ['OFFER', { offerId: 'offer-b' }, '45000'],
  ] as const)('uses only eligible %s items and subtracts shop-funded product discounts', (scopeType, scope, expected) => {
    expect(
      calculateAffiliateCommissionBase({ scopeType, ...scope }, items).toString(),
    ).toBe(expected);
  });
});
