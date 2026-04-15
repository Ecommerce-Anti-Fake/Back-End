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

    const categoryCount = await this.shopsRepository.countCategoriesByIds(categoryIds);
    if (categoryCount !== categoryIds.length) {
      throw new BadRequestException('One or more categories are invalid');
    }

    const shop = await this.shopsRepository.create({
      ownerUserId: input.ownerUserId,
      shopName,
      registrationType: input.registrationType,
      businessType,
      taxCode,
      shopStatus: 'active',
      categoryIds,
    });

    return toShopResponse(shop);
  }
}
