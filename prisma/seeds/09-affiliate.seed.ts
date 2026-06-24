import {
  AffiliateAccountStatus,
  AffiliateCommissionStatus,
  AffiliateConversionStatus,
  AffiliateProgramStatus,
  AffiliateScopeType,
  CommissionBeneficiaryType,
  PayoutStatus,
  PrismaClient,
} from '@prisma/client';
import { COUNTS, id, money, pick, recentDate, SeedContext } from './00-utils';

export async function seedAffiliate(prisma: PrismaClient, ctx: SeedContext) {
  for (let i = 0; i < COUNTS.affiliatePrograms; i += 1) {
    const shop = pick(ctx.shops, i);
    const brand = pick(ctx.brands, i);
    const program = await prisma.affiliateProgram.create({
      data: {
        id: id(),
        ownerShopId: shop.id,
        brandId: brand.id,
        offerId: i === 1 ? pick(ctx.offers, i).id : null,
        scopeType: i === 1 ? AffiliateScopeType.OFFER : AffiliateScopeType.BRAND,
        name: `${brand.name} Affiliate Program`,
        slug: `seed-${brand.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${i + 1}`,
        programStatus: AffiliateProgramStatus.ACTIVE,
        attributionWindowDays: 30,
        commissionModel: 'revenue_share',
        tier1Rate: money(6 + i),
        tier2Rate: money(2),
        rulesJson: { minOrderAmount: 100000, cookieDays: 30, seed: true },
        startedAt: recentDate(30),
      },
    });
    ctx.affiliatePrograms.push(program);
  }

  for (let i = 0; i < COUNTS.affiliateAccounts; i += 1) {
    const program = pick(ctx.affiliatePrograms, i);
    const parent = i >= 4 ? pick(ctx.affiliateAccounts, i - 4) : null;
    const account = await prisma.affiliateAccount.create({
      data: {
        id: id(),
        programId: program.id,
        userId: pick(ctx.users, i + 4).id,
        parentAccountId: parent?.id ?? null,
        accountStatus: i % 8 === 0 ? AffiliateAccountStatus.PENDING : AffiliateAccountStatus.ACTIVE,
        referralPath: parent ? `${parent.id}/${i + 1}` : `${i + 1}`,
        joinedAt: recentDate(25 - i),
        approvedAt: i % 8 === 0 ? null : recentDate(20 - i),
      },
    });
    ctx.affiliateAccounts.push(account);
  }

  for (let i = 0; i < COUNTS.affiliateCodes; i += 1) {
    const account = pick(ctx.affiliateAccounts, i);
    const program = ctx.affiliatePrograms.find((item) => item.id === account.programId) ?? pick(ctx.affiliatePrograms, i);
    const code = await prisma.affiliateCode.create({
      data: {
        id: id(),
        programId: program.id,
        accountId: account.id,
        code: `AFK${String(i + 1).padStart(5, '0')}`,
        landingUrl: `https://antifake.io.vn/products?aff=AFK${String(i + 1).padStart(5, '0')}`,
        isDefault: i < COUNTS.affiliateAccounts,
      },
    });
    ctx.affiliateCodes.push(code);
  }

  for (let i = 0; i < COUNTS.affiliateConversions; i += 1) {
    const code = pick(ctx.affiliateCodes, i);
    const account = ctx.affiliateAccounts.find((item) => item.id === code.accountId) ?? pick(ctx.affiliateAccounts, i);
    const program = ctx.affiliatePrograms.find((item) => item.id === code.programId) ?? pick(ctx.affiliatePrograms, i);
    const order = pick(ctx.orders, i);
    const offer = pick(ctx.offers, i);
    const amount = Number(order.totalAmount);
    const conversion = await prisma.affiliateConversion.create({
      data: {
        id: id(),
        programId: program.id,
        orderId: order.id,
        offerId: offer.id,
        affiliateCodeId: code.id,
        tier1AccountId: account.id,
        tier2AccountId: account.parentAccountId,
        customerUserId: order.buyerUserId,
        conversionStatus: i % 6 === 0 ? AffiliateConversionStatus.PENDING : AffiliateConversionStatus.APPROVED,
        orderAmount: money(amount),
        commissionBase: money(amount),
        metadata: { source: 'seed', campaign: 'uat-demo' },
        recordedAt: recentDate(20 - (i % 15)),
        approvedAt: i % 6 === 0 ? null : recentDate(15 - (i % 10)),
      },
    });
    ctx.affiliateConversions.push(conversion);
  }

  for (let i = 0; i < COUNTS.affiliateCommissionLedger; i += 1) {
    const conversion = pick(ctx.affiliateConversions, i);
    const beneficiaryType = i % 3 === 0 ? CommissionBeneficiaryType.PLATFORM : i % 3 === 1 ? CommissionBeneficiaryType.AFFILIATE_TIER_1 : CommissionBeneficiaryType.AFFILIATE_TIER_2;
    await prisma.affiliateCommissionLedger.create({
      data: {
        id: id(),
        conversionId: conversion.id,
        beneficiaryAccountId: beneficiaryType === CommissionBeneficiaryType.PLATFORM ? null : conversion.tier1AccountId,
        beneficiaryType,
        tierLevel: beneficiaryType === CommissionBeneficiaryType.AFFILIATE_TIER_2 ? 2 : beneficiaryType === CommissionBeneficiaryType.AFFILIATE_TIER_1 ? 1 : null,
        amount: money(10000 + (i % 20) * 3500),
        currency: 'VND',
        commissionStatus: i % 8 === 0 ? AffiliateCommissionStatus.PENDING : i % 5 === 0 ? AffiliateCommissionStatus.PAID : AffiliateCommissionStatus.APPROVED,
        lockedAt: i % 8 === 0 ? null : recentDate(10 - (i % 7)),
        paidAt: i % 5 === 0 ? recentDate(4 - (i % 3)) : null,
      },
    });
  }

  for (let i = 0; i < COUNTS.affiliatePayouts; i += 1) {
    const account = pick(ctx.affiliateAccounts, i);
    const program = ctx.affiliatePrograms.find((item) => item.id === account.programId) ?? pick(ctx.affiliatePrograms, i);
    await prisma.affiliatePayout.create({
      data: {
        id: id(),
        programId: program.id,
        accountId: account.id,
        periodStart: recentDate(35),
        periodEnd: recentDate(5),
        totalAmount: money(250000 + i * 175000),
        currency: 'VND',
        payoutStatus: i % 2 === 0 ? PayoutStatus.PAID : PayoutStatus.PROCESSING,
        externalRef: i % 2 === 0 ? `BANK-${String(i + 1).padStart(5, '0')}` : null,
        paidAt: i % 2 === 0 ? recentDate(2 + i) : null,
      },
    });
  }
}
