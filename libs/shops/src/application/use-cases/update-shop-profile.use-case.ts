import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';
import { toShopResponse } from './shops.mapper';

@Injectable()
export class UpdateShopProfileUseCase {
  constructor(private readonly shopsRepository: ShopsRepository) {}

  async execute(input: {
    shopId: string;
    requesterUserId: string;
    shopName?: string;
    businessType?: string;
    taxCode?: string | null;
  }) {
    const ownedShop = await this.shopsRepository.findOwnedShop(input.shopId, input.requesterUserId);
    if (!ownedShop) {
      throw new ForbiddenException('Shop does not belong to current user');
    }

    const data: {
      shopName?: string;
      businessType?: string;
      taxCode?: string | null;
    } = {};

    if (input.shopName !== undefined) {
      const shopName = input.shopName.trim();
      if (!shopName) {
        throw new BadRequestException('Shop name is required');
      }
      data.shopName = shopName;
    }

    if (input.businessType !== undefined) {
      const businessType = input.businessType.trim();
      if (!businessType) {
        throw new BadRequestException('Business type is required');
      }
      data.businessType = businessType;
    }

    if (input.taxCode !== undefined) {
      data.taxCode = input.taxCode?.trim() || null;
    }

    if (!Object.keys(data).length) {
      throw new BadRequestException('No shop profile fields to update');
    }

    const shop = await this.shopsRepository.updateProfile(input.shopId, data);
    return toShopResponse(shop);
  }
}
