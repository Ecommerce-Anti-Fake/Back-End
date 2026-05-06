import { BadRequestException, Injectable } from '@nestjs/common';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';
import { toShopResponse } from './shops.mapper';

@Injectable()
export class CreateShopUseCase {
  constructor(private readonly shopsRepository: ShopsRepository) {}

  async execute(input: {
    ownerUserId: string;
    shopName: string;
    registrationType: 'NORMAL' | 'HANDMADE' | 'MANUFACTURER' | 'DISTRIBUTOR';
    businessType: string;
    taxCode?: string | null;
    categoryIds: string[];
  }) {
    const shopName = input.shopName.trim();
    const businessType = input.businessType.trim();
    const taxCode = input.taxCode?.trim() || null;
    const categoryIds = [...new Set(input.categoryIds.map((id) => id.trim()).filter(Boolean))];

    if (!shopName) {
      throw new BadRequestException('Shop name is required');
    }

    if (!businessType) {
      throw new BadRequestException('Business type is required');
    }

    if (categoryIds.length === 0) {
      throw new BadRequestException('At least one category is required');
    }

    const existingShopCount = await this.shopsRepository.countByOwnerUserId(input.ownerUserId);
    if (existingShopCount > 0) {
      throw new BadRequestException('Each user can only create one shop');
    }

    const categoryCount = await this.shopsRepository.countCategoriesByIds(categoryIds);
    if (categoryCount !== categoryIds.length) {
      throw new BadRequestException('One or more categories are invalid');
    }

    const categories = await this.shopsRepository.findCategoriesByIds(categoryIds);
    const shopType = await this.shopsRepository.findActiveShopTypeByCode(input.registrationType);
    const approvedKyc = await this.shopsRepository.hasApprovedKycForOwner(input.ownerUserId);
    const shopStatus = this.resolveInitialShopStatus({
      registrationType: input.registrationType,
      hasApprovedKyc: !!approvedKyc,
      categoryRiskTiers: categories.map((category) => category.riskTier),
    });

    const shop = await this.shopsRepository.create({
      ownerUserId: input.ownerUserId,
      shopTypeId: shopType?.id ?? null,
      shopName,
      registrationType: input.registrationType,
      businessType,
      taxCode,
      shopStatus,
      categoryRegistrations: categories.map((category) => ({
        categoryId: category.id,
        registrationStatus: category.riskTier.trim().toLowerCase() === 'low' ? 'approved' : 'pending',
        approvedAt: category.riskTier.trim().toLowerCase() === 'low' ? new Date() : null,
      })),
    });

    return toShopResponse(shop);
  }

  private resolveInitialShopStatus(input: {
    registrationType: 'NORMAL' | 'HANDMADE' | 'MANUFACTURER' | 'DISTRIBUTOR';
    hasApprovedKyc: boolean;
    categoryRiskTiers: string[];
  }) {
    if (!input.hasApprovedKyc) {
      return 'pending_kyc';
    }

    if (input.registrationType === 'MANUFACTURER' || input.registrationType === 'DISTRIBUTOR') {
      return 'pending_verification';
    }

    const hasRegulatedCategory = input.categoryRiskTiers.some((riskTier) => riskTier.trim().toLowerCase() !== 'low');
    if (hasRegulatedCategory) {
      return 'pending_verification';
    }

    return 'active';
  }
}
