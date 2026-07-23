import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AffiliateRepository } from '../../infrastructure/persistence/affiliate.repository';
import { toAffiliateProgramResponse } from './affiliate.mapper';

@Injectable()
export class CreateAffiliateProgramUseCase {
  constructor(
    private readonly repository: AffiliateRepository,
    private readonly configService: ConfigService,
  ) {}

  async execute(input: {
    requesterUserId: string;
    ownerShopId?: string | null;
    offerId?: string | null;
    scopeType: 'PLATFORM' | 'SHOP' | 'BRAND' | 'OFFER';
    name: string;
    slug?: string;
    attributionWindowDays?: number;
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
    if (input.scopeType !== 'SHOP' && input.scopeType !== 'OFFER') {
      throw new BadRequestException('New affiliate programs only support SHOP or OFFER scope');
    }

    const normalizedName = input.name.trim();
    if (!normalizedName) {
      throw new BadRequestException('Program name is required');
    }
    const normalizedSlug = input.slug?.trim().toLowerCase();
    if (normalizedSlug && !/^[a-z0-9-]+$/.test(normalizedSlug)) {
      throw new BadRequestException('Program slug must contain only lowercase letters, numbers, and hyphens');
    }

    if (input.tier2Rate > input.tier1Rate) {
      throw new BadRequestException('Tier 2 rate cannot be greater than tier 1 rate');
    }

    if (input.tier1Rate + input.tier2Rate > 100) {
      throw new BadRequestException('Combined affiliate rates cannot exceed 100 percent');
    }

    const commissionHoldDays = this.getCommissionHoldDays();

    const startedAt = this.parseOptionalDate(input.startedAt);
    const endedAt = this.parseOptionalDate(input.endedAt);
    if (startedAt && endedAt && startedAt > endedAt) {
      throw new BadRequestException('startedAt must be earlier than endsAt');
    }

    const slug = normalizedSlug
      ? await this.validateProvidedSlug(normalizedSlug)
      : await this.generateUniqueSlug(normalizedName);

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
      offerId: input.offerId ?? null,
      requesterUserId: input.requesterUserId,
    });

    const program = await this.repository.createProgram({
      ownerShopId: input.ownerShopId,
      brandId: null,
      offerId: input.offerId ?? null,
      scopeType: input.scopeType,
      name: normalizedName,
      slug,
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
    scopeType: 'SHOP' | 'OFFER';
    offerId: string | null;
    requesterUserId: string;
  }) {
    if (input.scopeType === 'SHOP') {
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

  private getCommissionHoldDays() {
    const configuredValue =
      this.configService.get<string | number>('AFFILIATE_COMMISSION_HOLD_DAYS') ?? 7;
    const commissionHoldDays = Number(configuredValue);
    if (
      !Number.isInteger(commissionHoldDays) ||
      commissionHoldDays < 1 ||
      commissionHoldDays > 30
    ) {
      throw new InternalServerErrorException(
        'AFFILIATE_COMMISSION_HOLD_DAYS must be an integer between 1 and 30',
      );
    }
    return commissionHoldDays;
  }

  private async validateProvidedSlug(slug: string) {
    if (await this.repository.findProgramBySlug(slug)) {
      throw new BadRequestException('Affiliate program slug already exists');
    }
    return slug;
  }

  private async generateUniqueSlug(name: string) {
    const baseSlug = this.slugify(name) || 'affiliate-program';
    let slug = baseSlug;
    let suffix = 2;
    while (await this.repository.findProgramBySlug(slug)) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
    return slug;
  }

  private slugify(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
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
