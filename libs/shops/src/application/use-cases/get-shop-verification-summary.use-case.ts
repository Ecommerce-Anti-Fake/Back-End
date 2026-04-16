import { Injectable, NotFoundException } from '@nestjs/common';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';
import { toShopVerificationSummaryResponse } from './shop-verification.mapper';

@Injectable()
export class GetShopVerificationSummaryUseCase {
  constructor(private readonly shopsRepository: ShopsRepository) {}

  async execute(input: { shopId: string; requesterUserId: string }) {
    const ownedShop = await this.shopsRepository.findOwnedShop(input.shopId, input.requesterUserId);
    if (!ownedShop) {
      throw new NotFoundException('Shop not found');
    }

    await this.shopsRepository.recomputeShopStatus(input.shopId);

    const shop = await this.shopsRepository.findShopVerificationSummaryById(input.shopId);
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    return toShopVerificationSummaryResponse(shop);
  }
}
