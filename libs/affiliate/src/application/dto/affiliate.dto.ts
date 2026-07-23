import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const AFFILIATE_SCOPE_TYPES = ['PLATFORM', 'SHOP', 'BRAND', 'OFFER'] as const;
const CREATE_AFFILIATE_SCOPE_TYPES = ['SHOP', 'OFFER'] as const;

export class AffiliatePageQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class SellerAffiliateProgramsQueryDto extends AffiliatePageQueryDto {
  @ApiPropertyOptional({ enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED'] })
  @IsOptional()
  @IsString()
  @IsIn(['DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED'])
  status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED';

  @ApiPropertyOptional({ example: 'summer' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class SellerAffiliateSummaryQueryDto {
  @ApiPropertyOptional({ example: 'program-id' })
  @IsOptional()
  @IsString()
  programId?: string;
}

export class AffiliateProgramCommissionsQueryDto extends AffiliatePageQueryDto {
  @ApiPropertyOptional({
    enum: ['PENDING', 'APPROVED', 'LOCKED', 'PAID', 'CANCELLED'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['PENDING', 'APPROVED', 'LOCKED', 'PAID', 'CANCELLED'])
  status?: 'PENDING' | 'APPROVED' | 'LOCKED' | 'PAID' | 'CANCELLED';

  @ApiPropertyOptional({ enum: [1, 2] })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([1, 2])
  tierLevel?: 1 | 2;
}

export class AffiliateProgramResponseDto {
  @ApiProperty({ example: 'program-id' }) id!: string;
  @ApiPropertyOptional({ example: 'shop-id', nullable: true }) ownerShopId!: string | null;
  @ApiPropertyOptional({ example: 'Main Shop', nullable: true }) ownerShopName!: string | null;
  @ApiPropertyOptional({ example: 'brand-id', nullable: true }) brandId!: string | null;
  @ApiPropertyOptional({ example: 'Brand A', nullable: true }) brandName!: string | null;
  @ApiPropertyOptional({ example: 'Model X', nullable: true }) productModelName!: string | null;
  @ApiPropertyOptional({ example: 'offer-id', nullable: true }) offerId!: string | null;
  @ApiPropertyOptional({ example: 'Offer title', nullable: true }) offerTitle!: string | null;
  @ApiProperty({ enum: AFFILIATE_SCOPE_TYPES, example: 'SHOP' })
  scopeType!: 'PLATFORM' | 'SHOP' | 'BRAND' | 'OFFER';
  @ApiProperty({ example: 'Shop Spring Campaign' }) name!: string;
  @ApiProperty({ example: 'shop-spring-campaign' }) slug!: string;
  @ApiProperty({ example: 'ACTIVE' }) programStatus!: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED';
  @ApiProperty({ example: 30 }) attributionWindowDays!: number;
  @ApiProperty({ example: 7 }) commissionHoldDays!: number;
  @ApiProperty({ example: 'revenue_share' }) commissionModel!: string;
  @ApiProperty({ enum: ['MANUAL', 'AUTOMATIC'], example: 'AUTOMATIC' }) settlementMode!: 'MANUAL' | 'AUTOMATIC';
  @ApiProperty({ example: 12 }) tier1Rate!: number;
  @ApiProperty({ example: 5 }) tier2Rate!: number;
  @ApiPropertyOptional({ example: '2026-04-15T00:00:00.000Z', nullable: true }) startedAt!: Date | null;
  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z', nullable: true }) endedAt!: Date | null;
  @ApiProperty({ example: '2026-04-14T10:00:00.000Z' }) createdAt!: Date;
}

export class CreateAffiliateProgramDto {
  @ApiPropertyOptional({ example: 'shop-id' }) @IsOptional() @IsString() ownerShopId?: string;
  @ApiPropertyOptional({ example: 'offer-id' }) @IsOptional() @IsString() offerId?: string;
  @ApiProperty({ enum: CREATE_AFFILIATE_SCOPE_TYPES, example: 'SHOP' })
  @IsString()
  @IsIn(CREATE_AFFILIATE_SCOPE_TYPES)
  scopeType!: 'SHOP' | 'OFFER';
  @ApiProperty({ example: 'Shop Spring Campaign' }) @IsString() name!: string;
  @ApiPropertyOptional({ example: 'shop-spring-campaign' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  slug?: string;
  @ApiPropertyOptional({ example: 30 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(90) attributionWindowDays?: number;
  @ApiPropertyOptional({ example: 'revenue_share' }) @IsOptional() @IsString() commissionModel?: string;
  @ApiProperty({ example: 12 }) @Type(() => Number) @Min(0.01) @Max(100) tier1Rate!: number;
  @ApiProperty({ example: 5 }) @Type(() => Number) @Min(0) @Max(100) tier2Rate!: number;
  @ApiPropertyOptional({ example: { allowSelfReferral: false } }) @IsOptional() @IsObject() rulesJson?: Record<string, unknown>;
  @ApiPropertyOptional({ example: '2026-04-15T00:00:00.000Z' }) @IsOptional() @IsString() startedAt?: string;
  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' }) @IsOptional() @IsString() endedAt?: string;
}

export class UpdateAffiliateProgramDto {
  @ApiPropertyOptional({ example: 'Shop Spring Campaign' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ enum: CREATE_AFFILIATE_SCOPE_TYPES })
  @IsOptional()
  @IsString()
  @IsIn(CREATE_AFFILIATE_SCOPE_TYPES)
  scopeType?: 'SHOP' | 'OFFER';

  @ApiPropertyOptional({ example: 'offer-id', nullable: true })
  @IsOptional()
  @IsString()
  offerId?: string | null;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  attributionWindowDays?: number;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @Type(() => Number)
  @Min(0.01)
  @Max(100)
  tier1Rate?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  tier2Rate?: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  startedAt?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  endedAt?: string | null;

  @ApiPropertyOptional({ enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED'] })
  @IsOptional()
  @IsString()
  @IsIn(['DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED'])
  programStatus?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED';
}

export class PaginatedAffiliateProgramResponseDto {
  @ApiProperty({ type: AffiliateProgramResponseDto, isArray: true }) items!: AffiliateProgramResponseDto[];
  @ApiProperty({ example: 1 }) page!: number;
  @ApiProperty({ example: 20 }) pageSize!: number;
  @ApiProperty({ example: 42 }) total!: number;
  @ApiProperty({ example: 3 }) totalPages!: number;
}

export class SellerAffiliateProgramResponseDto extends AffiliateProgramResponseDto {
  @ApiProperty({ example: 24 }) memberCount!: number;
  @ApiProperty({ example: 57 }) conversionCount!: number;
  @ApiProperty({ example: true }) configurationLocked!: boolean;
}

export class PaginatedSellerAffiliateProgramResponseDto {
  @ApiProperty({ type: SellerAffiliateProgramResponseDto, isArray: true })
  items!: SellerAffiliateProgramResponseDto[];
  @ApiProperty({ example: 1 }) page!: number;
  @ApiProperty({ example: 20 }) pageSize!: number;
  @ApiProperty({ example: 42 }) total!: number;
  @ApiProperty({ example: 3 }) totalPages!: number;
}

export class SellerAffiliateSummaryResponseDto {
  @ApiProperty({ example: 4 }) programCount!: number;
  @ApiProperty({ example: 3 }) activeProgramCount!: number;
  @ApiProperty({ example: 28 }) memberCount!: number;
  @ApiProperty({ example: 41 }) conversionCount!: number;
  @ApiProperty({ example: '12000.5' }) pendingCommissionAmount!: string;
  @ApiProperty({ example: '0' }) approvedCommissionAmount!: string;
  @ApiProperty({ example: '30000' }) lockedCommissionAmount!: string;
  @ApiProperty({ example: '90000' }) paidCommissionAmount!: string;
  @ApiProperty({ example: '0' }) cancelledCommissionAmount!: string;
  @ApiProperty({ example: 'VND' }) currency!: string;
}

export class ResolveAffiliateAttributionDto {
  @ApiProperty({ example: 'spring-aff-001' })
  @IsString()
  @Matches(/^[a-zA-Z0-9-]+$/)
  code!: string;
}

export class AffiliateAttributionResponseDto {
  @ApiProperty({ example: 'spring-aff-001' }) code!: string;
  @ApiProperty({ example: 'program-id' }) programId!: string;
  @ApiProperty({ example: 'signed-token' }) attributionToken!: string;
  @ApiProperty({ example: '2026-07-29T10:00:00.000Z' }) expiresAt!: Date;
}

export class AffiliateAccountProgramSummaryResponseDto {
  @ApiPropertyOptional({ example: 'shop-id', nullable: true }) ownerShopId!: string | null;
  @ApiPropertyOptional({ example: 'Main Shop', nullable: true }) ownerShopName!: string | null;
  @ApiProperty({ enum: AFFILIATE_SCOPE_TYPES, example: 'SHOP' })
  scopeType!: 'PLATFORM' | 'SHOP' | 'BRAND' | 'OFFER';
  @ApiPropertyOptional({ example: 'offer-id', nullable: true }) offerId!: string | null;
  @ApiPropertyOptional({ example: 'Offer title', nullable: true }) offerTitle!: string | null;
  @ApiProperty({ example: 'ACTIVE' }) programStatus!: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED';
  @ApiProperty({ example: 12 }) tier1Rate!: number;
  @ApiProperty({ example: 5 }) tier2Rate!: number;
  @ApiProperty({ example: 7 }) commissionHoldDays!: number;
  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z', nullable: true }) endedAt!: Date | null;
}

export class AffiliateAccountResponseDto {
  @ApiProperty({ example: 'account-id' }) id!: string;
  @ApiProperty({ example: 'program-id' }) programId!: string;
  @ApiProperty({ example: 'Shop Spring Campaign' }) programName!: string;
  @ApiProperty({ example: 'user-id' }) userId!: string;
  @ApiPropertyOptional({ example: 'parent-account-id', nullable: true }) parentAccountId!: string | null;
  @ApiProperty({ example: 'ACTIVE' }) accountStatus!: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'BLOCKED';
  @ApiPropertyOptional({ example: 'parent-1/parent-2', nullable: true }) referralPath!: string | null;
  @ApiProperty({ example: '2026-04-14T10:00:00.000Z' }) joinedAt!: Date;
  @ApiPropertyOptional({ example: '2026-04-14T10:00:00.000Z', nullable: true }) approvedAt!: Date | null;
  @ApiProperty({ type: AffiliateAccountProgramSummaryResponseDto })
  program!: AffiliateAccountProgramSummaryResponseDto;
}

export class AffiliateProgramMemberResponseDto {
  @ApiProperty({ example: 'account-id' }) accountId!: string;
  @ApiProperty({ example: 'Nguyen Van A' }) displayName!: string;
  @ApiPropertyOptional({ example: 'parent-account-id', nullable: true }) parentAccountId!: string | null;
  @ApiPropertyOptional({ example: 'Tran Van B', nullable: true }) parentDisplayName!: string | null;
  @ApiProperty({ example: 2 }) networkDepth!: number;
  @ApiProperty({ example: 'ACTIVE' }) accountStatus!: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'BLOCKED';
  @ApiProperty({ example: '2026-07-22T00:00:00.000Z' }) joinedAt!: Date;
}

export class PaginatedAffiliateProgramMemberResponseDto {
  @ApiProperty({ type: AffiliateProgramMemberResponseDto, isArray: true }) items!: AffiliateProgramMemberResponseDto[];
  @ApiProperty({ example: 1 }) page!: number;
  @ApiProperty({ example: 20 }) pageSize!: number;
  @ApiProperty({ example: 42 }) total!: number;
  @ApiProperty({ example: 3 }) totalPages!: number;
}

export class JoinAffiliateProgramDto {
  @ApiProperty({ example: 'program-id' }) @IsString() programId!: string;
  @ApiPropertyOptional({ example: 'spring-aff-001' }) @IsOptional() @IsString() referralCode?: string;
}

export class AffiliateCodeResponseDto {
  @ApiProperty({ example: 'code-id' }) id!: string;
  @ApiProperty({ example: 'program-id' }) programId!: string;
  @ApiProperty({ example: 'account-id' }) accountId!: string;
  @ApiProperty({ example: 'spring-aff-001' }) code!: string;
  @ApiPropertyOptional({ example: 'https://example.com/landing', nullable: true }) landingUrl!: string | null;
  @ApiProperty({ example: true }) isDefault!: boolean;
  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z', nullable: true }) expiresAt!: Date | null;
  @ApiProperty({ example: '2026-04-14T10:00:00.000Z' }) createdAt!: Date;
}

export class CreateAffiliateCodeDto {
  @ApiProperty({ example: 'account-id' }) @IsString() accountId!: string;
  @ApiProperty({ example: 'spring-aff-001' }) @IsString() @Matches(/^[a-z0-9-]+$/) code!: string;
  @ApiPropertyOptional({ example: 'https://example.com/landing' }) @IsOptional() @IsString() landingUrl?: string;
  @ApiPropertyOptional({ example: true }) @IsOptional() @Type(() => Boolean) @IsBoolean() isDefault?: boolean;
  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' }) @IsOptional() @IsString() expiresAt?: string;
}

export class AffiliateAccountSummaryResponseDto {
  @ApiProperty({ example: 'account-id' }) accountId!: string;
  @ApiProperty({ example: 'program-id' }) programId!: string;
  @ApiProperty({ example: 'Spring Program' }) programName!: string;
  @ApiProperty({ example: 12 }) totalConversions!: number;
  @ApiProperty({ example: 5 }) totalTier1Conversions!: number;
  @ApiProperty({ example: 7 }) totalTier2Conversions!: number;
  @ApiProperty({ example: 250000 }) totalCommissionAmount!: number;
  @ApiProperty({ example: 15000 }) pendingCommissionAmount!: number;
  @ApiProperty({ example: 35000 }) approvedCommissionAmount!: number;
  @ApiProperty({ example: 50000 }) lockedCommissionAmount!: number;
  @ApiProperty({ example: 150000 }) paidCommissionAmount!: number;
  @ApiProperty({ example: 0 }) cancelledCommissionAmount!: number;
}

export class AffiliateCommissionEntryResponseDto {
  @ApiProperty({ example: 'ledger-id' }) id!: string;
  @ApiProperty({ example: 'conversion-id' }) conversionId!: string;
  @ApiPropertyOptional({ example: 'payout-id', nullable: true }) payoutId!: string | null;
  @ApiProperty({ example: 'AFFILIATE_TIER_1' }) beneficiaryType!: 'AFFILIATE_TIER_1' | 'AFFILIATE_TIER_2' | 'PLATFORM' | 'SHOP';
  @ApiPropertyOptional({ example: 1, nullable: true }) tierLevel!: number | null;
  @ApiProperty({ example: 12000 }) amount!: number;
  @ApiProperty({ example: 'PENDING' }) commissionStatus!: 'PENDING' | 'APPROVED' | 'LOCKED' | 'PAID' | 'CANCELLED';
  @ApiProperty({ example: 'VND' }) currency!: string;
  @ApiProperty({ example: '2026-04-14T10:00:00.000Z' }) createdAt!: Date;
  @ApiPropertyOptional({ example: '2026-05-01T10:00:00.000Z', nullable: true }) paidAt!: Date | null;
  @ApiPropertyOptional({ example: '2026-04-20T10:00:00.000Z', nullable: true }) lockedAt!: Date | null;
  @ApiPropertyOptional({ example: '2026-04-27T10:00:00.000Z', nullable: true }) availableAt!: Date | null;
}

export class PaginatedAffiliateCommissionEntryResponseDto {
  @ApiProperty({ type: AffiliateCommissionEntryResponseDto, isArray: true }) items!: AffiliateCommissionEntryResponseDto[];
  @ApiProperty({ example: 1 }) page!: number;
  @ApiProperty({ example: 20 }) pageSize!: number;
  @ApiProperty({ example: 42 }) total!: number;
  @ApiProperty({ example: 3 }) totalPages!: number;
}

export class AffiliateProgramCommissionResponseDto {
  @ApiProperty({ example: 'commission-id' }) id!: string;
  @ApiProperty({ example: 'conversion-id' }) conversionId!: string;
  @ApiPropertyOptional({ example: 'order-id', nullable: true }) orderId!: string | null;
  @ApiPropertyOptional({ example: 'account-id', nullable: true }) memberAccountId!: string | null;
  @ApiProperty({ example: 'Nguyen Van A' }) memberDisplayName!: string;
  @ApiPropertyOptional({ example: 1, nullable: true }) tierLevel!: number | null;
  @ApiProperty({ example: '12500.25' }) amount!: string;
  @ApiProperty({ example: 'VND' }) currency!: string;
  @ApiProperty({ example: 'LOCKED' }) commissionStatus!: string;
  @ApiProperty({ example: '2026-07-20T00:00:00.000Z' }) recordedAt!: Date;
  @ApiPropertyOptional({ nullable: true }) approvedAt!: Date | null;
  @ApiProperty({ example: '2026-07-20T00:00:00.000Z' }) createdAt!: Date;
  @ApiPropertyOptional({ nullable: true }) lockedAt!: Date | null;
  @ApiPropertyOptional({ nullable: true }) availableAt!: Date | null;
  @ApiPropertyOptional({ nullable: true }) paidAt!: Date | null;
  @ApiPropertyOptional({ nullable: true }) payoutId!: string | null;
  @ApiPropertyOptional({ nullable: true }) payoutStatus!: string | null;
  @ApiPropertyOptional({ nullable: true }) externalRef!: string | null;
}

export class PaginatedAffiliateProgramCommissionResponseDto {
  @ApiProperty({ type: AffiliateProgramCommissionResponseDto, isArray: true })
  items!: AffiliateProgramCommissionResponseDto[];
  @ApiProperty({ example: 1 }) page!: number;
  @ApiProperty({ example: 20 }) pageSize!: number;
  @ApiProperty({ example: 42 }) total!: number;
  @ApiProperty({ example: 3 }) totalPages!: number;
}

export class AffiliateConversionResponseDto {
  @ApiProperty({ example: 'conversion-id' }) id!: string;
  @ApiProperty({ example: 'program-id' }) programId!: string;
  @ApiPropertyOptional({ example: 'order-id', nullable: true }) orderId!: string | null;
  @ApiPropertyOptional({ example: 'offer-id', nullable: true }) offerId!: string | null;
  @ApiPropertyOptional({ example: 'affiliate-code-id', nullable: true }) affiliateCodeId!: string | null;
  @ApiProperty({ example: 'tier1-account-id' }) tier1AccountId!: string;
  @ApiPropertyOptional({ example: 'tier2-account-id', nullable: true }) tier2AccountId!: string | null;
  @ApiPropertyOptional({ example: 'buyer-user-id', nullable: true }) customerUserId!: string | null;
  @ApiProperty({ example: 'PENDING' }) conversionStatus!: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  @ApiPropertyOptional({ example: 200000, nullable: true }) orderAmount!: number | null;
  @ApiPropertyOptional({ example: 40000, nullable: true }) commissionBase!: number | null;
  @ApiProperty({ example: '2026-04-14T10:00:00.000Z' }) recordedAt!: Date;
  @ApiPropertyOptional({ example: '2026-04-15T10:00:00.000Z', nullable: true }) approvedAt!: Date | null;
}

export class ApproveAffiliateConversionDto {
  @ApiProperty({ example: 'conversion-id' }) @IsString() conversionId!: string;
}

export class RejectAffiliateConversionDto {
  @ApiProperty({ example: 'conversion-id' }) @IsString() conversionId!: string;
}

export class AffiliatePayoutResponseDto {
  @ApiProperty({ example: 'payout-id' }) id!: string;
  @ApiProperty({ example: 'program-id' }) programId!: string;
  @ApiProperty({ example: 'account-id' }) accountId!: string;
  @ApiProperty({ example: '2026-04-01T00:00:00.000Z' }) periodStart!: Date;
  @ApiProperty({ example: '2026-04-30T23:59:59.999Z' }) periodEnd!: Date;
  @ApiProperty({ example: 125000 }) totalAmount!: number;
  @ApiProperty({ example: 'PENDING' }) payoutStatus!: 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' | 'CANCELLED';
  @ApiPropertyOptional({ example: 'bank-batch-001', nullable: true }) externalRef!: string | null;
  @ApiProperty({ example: '2026-05-01T10:00:00.000Z' }) createdAt!: Date;
}

export class CreateAffiliatePayoutDto {
  @ApiProperty({ example: 'program-id' }) @IsString() programId!: string;
  @ApiProperty({ example: 'account-id' }) @IsString() accountId!: string;
  @ApiProperty({ example: '2026-04-01T00:00:00.000Z' }) @IsString() periodStart!: string;
  @ApiProperty({ example: '2026-04-30T23:59:59.999Z' }) @IsString() periodEnd!: string;
  @ApiPropertyOptional({ example: 'bank-batch-001' }) @IsOptional() @IsString() externalRef?: string;
}

export class UpdateAffiliatePayoutStatusDto {
  @ApiProperty({ example: 'payout-id' }) @IsString() payoutId!: string;
  @ApiProperty({ example: 'PAID', enum: ['PROCESSING', 'PAID', 'FAILED', 'CANCELLED'] })
  @IsString()
  @IsIn(['PROCESSING', 'PAID', 'FAILED', 'CANCELLED'])
  payoutStatus!: 'PROCESSING' | 'PAID' | 'FAILED' | 'CANCELLED';
}
