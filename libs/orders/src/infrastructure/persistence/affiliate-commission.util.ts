export function calculateAffiliateCommissionAmounts(input: {
  commissionBase: number;
  tier1Rate: number;
  tier2Rate: number;
  tier2Eligible: boolean;
}) {
  const tier1Amount = roundMoney(input.commissionBase * (input.tier1Rate / 100));
  const tier2Amount = input.tier2Eligible
    ? roundMoney(tier1Amount * (input.tier2Rate / 100))
    : 0;

  return {
    tier1Amount,
    tier2Amount,
  };
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
