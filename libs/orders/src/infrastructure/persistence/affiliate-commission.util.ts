import { Prisma } from '@prisma/client';

export function calculateAffiliateCommissionAmounts(input: {
  commissionBase: Prisma.Decimal.Value;
  tier1Rate: Prisma.Decimal.Value;
  tier2Rate: Prisma.Decimal.Value;
  tier2Eligible: boolean;
}) {
  const commissionBase = new Prisma.Decimal(input.commissionBase);
  const tier1Amount = roundMoney(commissionBase.mul(input.tier1Rate).div(100));
  const tier2Amount = input.tier2Eligible
    ? roundMoney(commissionBase.mul(input.tier2Rate).div(100))
    : new Prisma.Decimal(0);

  return {
    tier1Amount,
    tier2Amount,
  };
}

function roundMoney(value: Prisma.Decimal.Value) {
  return new Prisma.Decimal(value).toDecimalPlaces(2);
}
