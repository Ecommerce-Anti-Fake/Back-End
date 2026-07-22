import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AffiliateRepository } from '../../infrastructure/persistence/affiliate.repository';
import { toAffiliateProgramResponse } from './affiliate.mapper';

@Injectable()
export class CreateAffiliateProgramUseCase {
  constructor(private readonly repository: AffiliateRepository) {}

  async execute(input: {
    requesterUserId: string;
    ownerShopId?: string | null;
    brandId?: string | null;
    offerId?: string | null;
    scopeType: 'PLATFORM' | 'SHOP' | 'BRAND' | 'OFFER';
    name: string;
    slug: string;
    attributionWindowDays?: number;
    commissionHoldDays?: number;
    commissionModel?: string;
    tier1Rate: number;
    tier2Rate: number;
    rulesJson?: Record<string, unknown> | null;
    startedAt?: string | null;
    endedAt?: string | null;
  }) {
    if ((input.scopeType as string) === 'PRODUCT_MODEL') {
      throw new BadRequestException('PRODUCT_MODEL affiliate scope is removed; use OFFER, BRAND, or SHOP scope');
    }

    if (input.scopeType === 'PLATFORM') {
      throw new BadRequestException('PLATFORM affiliate scope is not supported yet');
    }

    const normalizedName = input.name.trim();
    const normalizedSlug = input.slug.trim().toLowerCase();
    if (!normalizedName) {
      throw new BadRequestException('Program name is required');
    }

    if (input.tier2Rate > input.tier1Rate) {
      throw new BadRequestException('Tier 2 rate cannot be greater than tier 1 rate');
    }

    if (input.tier1Rate + input.tier2Rate > 100) {
      throw new BadRequestException('Combined affiliate rates cannot exceed 100 percent');
    }

    const commissionHoldDays = input.commissionHoldDays ?? 7;
    if (!Number.isInteger(commissionHoldDays) || commissionHoldDays < 0 || commissionHoldDays > 30) {
      throw new BadRequestException('commissionHoldDays must be an integer between 0 and 30');
    }

    const startedAt = this.parseOptionalDate(input.startedAt);
    const endedAt = this.parseOptionalDate(input.endedAt);
    if (startedAt && endedAt && startedAt > endedAt) {
      throw new BadRequestException('startedAt must be earlier than endsAt');
    }

    const existingProgram = await this.repository.findProgramBySlug(normalizedSlug);
    if (existingProgram) {
      throw new BadRequestException('Affiliate program slug already exists');
    }

    if (!input.ownerShopId) {
      throw new BadRequestException('ownerShopId is required for this affiliate scope');
    }

    const ownerShop = await this.repository.findOwnedShop(input.ownerShopId, input.requesterUserId);
    if (!ownerShop) {
      throw new BadRequestException('Owner shop is invalid or not owned by current user');
    }
    if (ownerShop.shopStatus !== 'verified') {
      throw new BadRequestException('Owner shop must be verified');
    }

    await this.validateScopeTarget({
      ownerShopId: input.ownerShopId,
      scopeType: input.scopeType,
      brandId: input.brandId ?? null,
      offerId: input.offerId ?? null,
      requesterUserId: input.requesterUserId,
    });

    const program = await this.repository.createProgram({
      ownerShopId: input.ownerShopId,
      brandId: input.brandId ?? null,
      offerId: input.offerId ?? null,
      scopeType: input.scopeType,
      name: normalizedName,
      slug: normalizedSlug,
      attributionWindowDays: input.attributionWindowDays ?? 30,
      commissionHoldDays,
      commissionModel: input.commissionModel?.trim() || 'revenue_share',
      settlementMode: 'AUTOMATIC',
      tier1Rate: input.tier1Rate,
      tier2Rate: input.tier2Rate,
      rulesJson: input.rulesJson ?? null,
      startedAt,
      endedAt,
    });

    return toAffiliateProgramResponse(program);
  }

  private async validateScopeTarget(input: {
    ownerShopId: string;
    scopeType: 'SHOP' | 'BRAND' | 'OFFER';
    brandId: string | null;
    offerId: string | null;
    requesterUserId: string;
  }) {
    if (input.scopeType === 'SHOP') {
      return;
    }

    if (input.scopeType === 'BRAND') {
      if (!input.brandId) {
        throw new BadRequestException('brandId is required for BRAND affiliate scope');
      }

      const brand = await this.repository.findBrandById(input.brandId);
      if (!brand) {
        throw new NotFoundException('Brand not found');
      }

      const authorization = await this.repository.findApprovedBrandForShop(
        input.ownerShopId,
        input.brandId,
      );
      if (!authorization) {
        throw new BadRequestException('Shop is not approved to promote this brand');
      }

      return;
    }

    if (!input.offerId) {
      throw new BadRequestException('offerId is required for OFFER affiliate scope');
    }

    const offer = await this.repository.findOwnedOffer(input.offerId, input.requesterUserId);
    if (!offer || offer.shopId !== input.ownerShopId) {
      throw new BadRequestException('Offer is invalid for the selected owner shop');
    }
  }

  private parseOptionalDate(value?: string | null) {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid datetime format');
    }

    return date;
  }
}
