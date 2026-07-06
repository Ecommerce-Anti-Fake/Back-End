import { Injectable, NotFoundException } from '@nestjs/common';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';
import { toAdminShopRegistrationDetailResponse } from './shop-verification.mapper';

@Injectable()
export class GetAdminShopRegistrationDetailUseCase {
  constructor(private readonly shopsRepository: ShopsRepository) {}

  async execute(shopId: string) {
    await this.shopsRepository.recomputeShopStatus(shopId);

    const shop = await this.shopsRepository.findAdminShopVerificationDetailById(shopId);
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    return toAdminShopRegistrationDetailResponse(shop);
  }
}
