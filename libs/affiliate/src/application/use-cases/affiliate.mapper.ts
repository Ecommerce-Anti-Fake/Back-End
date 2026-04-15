import { Prisma } from '@prisma/client';
import {
  AffiliateAccountWithRelations,
  AffiliateConversionWithRelations,
  AffiliateCodeWithRelations,
  AffiliatePayoutWithRelations,
  AffiliateProgramWithRelations,
} from '../../infrastructure/persistence/affiliate.repository';

export function toAffiliateProgramResponse(program: AffiliateProgramWithRelations) {
  return {
    id: program.id,
    ownerShopId: program.ownerShopId,
    ownerShopName: program.ownerShop?.shopName ?? null,
    brandId: program.brandId,
    brandName: program.brand?.name ?? null,
    productModelId: program.productModelId,
    productModelName: program.productModel?.modelName ?? null,
    offerId: program.offerId,
    offerTitle: program.offer?.title ?? null,
    scopeType: program.scopeType,
    name: program.name,
    slug: program.slug,
    programStatus: program.programStatus,
    attributionWindowDays: program.attributionWindowDays,
    commissionModel: program.commissionModel,
    tier1Rate: decimalToNumber(program.tier1Rate),
    tier2Rate: decimalToNumber(program.tier2Rate),
    startedAt: program.startedAt,
    endedAt: program.endedAt,
    createdAt: program.createdAt,
  };
}

export function toAffiliateAccountResponse(account: AffiliateAccountWithRelations) {
  return {
    id: account.id,
    programId: account.programId,
    programName: account.program.name,
    userId: account.userId,
    parentAccountId: account.parentAccountId,
    accountStatus: account.accountStatus,
    referralPath: account.referralPath,
    joinedAt: account.joinedAt,
    approvedAt: account.approvedAt,
  };
}

export function toAffiliateCodeResponse(code: AffiliateCodeWithRelations) {
  return {
    id: code.id,
    programId: code.programId,
    accountId: code.accountId,
    code: code.code,
    landingUrl: code.landingUrl,
    isDefault: code.isDefault,
    expiresAt: code.expiresAt,
    createdAt: code.createdAt,
  };
}

export function toAffiliateCommissionEntryResponse(entry: {
  id: string;
  conversionId: string;
  payoutId: string | null;
  beneficiaryType: 'AFFILIATE_TIER_1' | 'AFFILIATE_TIER_2' | 'PLATFORM' | 'SHOP';
  tierLevel: number | null;
  amount: Prisma.Decimal;
  commissionStatus: 'PENDING' | 'APPROVED' | 'LOCKED' | 'PAID' | 'CANCELLED';
  currency: string;
  createdAt: Date;
  paidAt: Date | null;
  lockedAt: Date | null;
}) {
  return {
    id: entry.id,
    conversionId: entry.conversionId,
    payoutId: entry.payoutId,
    beneficiaryType: entry.beneficiaryType,
    tierLevel: entry.tierLevel,
    amount: decimalToNumber(entry.amount),
    commissionStatus: entry.commissionStatus,
    currency: entry.currency,
    createdAt: entry.createdAt,
    paidAt: entry.paidAt,
    lockedAt: entry.lockedAt,
  };
}

export function toAffiliateConversionResponse(conversion: AffiliateConversionWithRelations) {
  return {
    id: conversion.id,
    programId: conversion.programId,
    orderId: conversion.orderId,
    offerId: conversion.offerId,
    affiliateCodeId: conversion.affiliateCodeId,
    tier1AccountId: conversion.tier1AccountId,
    tier2AccountId: conversion.tier2AccountId,
    customerUserId: conversion.customerUserId,
    conversionStatus: conversion.conversionStatus,
    orderAmount: conversion.orderAmount ? decimalToNumber(conversion.orderAmount) : null,
    commissionBase: conversion.commissionBase ? decimalToNumber(conversion.commissionBase) : null,
    recordedAt: conversion.recordedAt,
    approvedAt: conversion.approvedAt,
  };
}

export function toAffiliatePayoutResponse(payout: AffiliatePayoutWithRelations) {
  return {
    id: payout.id,
    programId: payout.programId,
    accountId: payout.accountId,
    periodStart: payout.periodStart,
    periodEnd: payout.periodEnd,
    totalAmount: decimalToNumber(payout.totalAmount),
    payoutStatus: payout.payoutStatus,
    externalRef: payout.externalRef,
    createdAt: payout.createdAt,
  };
}

function decimalToNumber(value: Prisma.Decimal) {
  return Number(value.toString());
}
