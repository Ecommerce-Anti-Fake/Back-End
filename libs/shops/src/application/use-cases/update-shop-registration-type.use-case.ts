import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';
import { toShopResponse } from './shops.mapper';

@Injectable()
export class UpdateShopRegistrationTypeUseCase {
  constructor(private readonly shopsRepository: ShopsRepository) {}

  async execute(input: {
    shopId: string;
    requesterUserId: string;
    registrationType: 'NORMAL' | 'HANDMADE' | 'MANUFACTURER' | 'DISTRIBUTOR';
  }) {
    const ownedShop = await this.shopsRepository.findOwnedShop(input.shopId, input.requesterUserId);
    if (!ownedShop) {
      throw new ForbiddenException('Shop does not belong to current user');
    }

    if (ownedShop.registrationType === input.registrationType) {
      throw new BadRequestException('Shop already uses this registration type');
    }

    const shopType = await this.shopsRepository.findActiveShopTypeByCode(input.registrationType);
    await this.shopsRepository.updateRegistrationType(input.shopId, {
      registrationType: input.registrationType,
      shopTypeId: shopType?.id ?? null,
    });

    const shop = await this.shopsRepository.recomputeShopStatus(input.shopId);
    if (!shop) {
      throw new BadRequestException('Shop not found');
    }

    return toShopResponse(shop);
  }
}
