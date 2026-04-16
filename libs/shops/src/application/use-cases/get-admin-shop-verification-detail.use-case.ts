import { Injectable, NotFoundException } from '@nestjs/common';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';
import { toAdminShopVerificationDetailResponse } from './shop-verification.mapper';

@Injectable()
export class GetAdminShopVerificationDetailUseCase {
  constructor(private readonly shopsRepository: ShopsRepository) {}

  async execute(shopId: string) {
    await this.shopsRepository.recomputeShopStatus(shopId);

    const shop = await this.shopsRepository.findAdminShopVerificationDetailById(shopId);
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    const timeline = await this.shopsRepository.findAuditLogsByTarget('SHOP_VERIFICATION', shop.id);
    return toAdminShopVerificationDetailResponse(shop, timeline);
  }
}
