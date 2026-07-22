import { Prisma } from '@prisma/client';
import { calculateAffiliateCommissionAmounts } from './affiliate-commission.util';

describe('calculateAffiliateCommissionAmounts', () => {
  it('calculates both tiers from the same commission base with Decimal precision', () => {
    const result = calculateAffiliateCommissionAmounts({
      commissionBase: new Prisma.Decimal('123456.78'),
      tier1Rate: new Prisma.Decimal('6'),
      tier2Rate: new Prisma.Decimal('2'),
      tier2Eligible: true,
    });

    expect(result.tier1Amount.toFixed(2)).toBe('7407.41');
    expect(result.tier2Amount.toFixed(2)).toBe('2469.14');
  });

  it('returns zero for tier 2 when the direct affiliate has no active parent', () => {
    const result = calculateAffiliateCommissionAmounts({
      commissionBase: new Prisma.Decimal('20000'),
      tier1Rate: new Prisma.Decimal('50'),
      tier2Rate: new Prisma.Decimal('20'),
      tier2Eligible: false,
    });

    expect(result.tier1Amount.toFixed(2)).toBe('10000.00');
    expect(result.tier2Amount.toFixed(2)).toBe('0.00');
  });
});
