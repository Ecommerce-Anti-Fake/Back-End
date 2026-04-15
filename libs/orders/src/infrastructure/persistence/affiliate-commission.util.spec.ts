import { calculateAffiliateCommissionAmounts } from './affiliate-commission.util';

describe('calculateAffiliateCommissionAmounts', () => {
  it('should calculate tier 2 from tier 1 amount', () => {
    const result = calculateAffiliateCommissionAmounts({
      commissionBase: 20000,
      tier1Rate: 50,
      tier2Rate: 20,
      tier2Eligible: true,
    });

    expect(result).toEqual({
      tier1Amount: 10000,
      tier2Amount: 2000,
    });
  });

  it('should return zero for tier 2 when not eligible', () => {
    const result = calculateAffiliateCommissionAmounts({
      commissionBase: 20000,
      tier1Rate: 50,
      tier2Rate: 20,
      tier2Eligible: false,
    });

    expect(result).toEqual({
      tier1Amount: 10000,
      tier2Amount: 0,
    });
  });
});
