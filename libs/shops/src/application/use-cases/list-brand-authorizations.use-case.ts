import { Injectable, NotFoundException } from '@nestjs/common';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';
import { toBrandAuthorizationResponse } from './shops.mapper';

@Injectable()
export class ListBrandAuthorizationsUseCase {
  constructor(private readonly shopsRepository: ShopsRepository) {}

  async execute(input: { shopId: string; requesterUserId: string }) {
    const shop = await this.shopsRepository.findOwnedShop(input.shopId, input.requesterUserId);
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    const authorizations = await this.shopsRepository.findBrandAuthorizationsByShopId(shop.id);
    return authorizations.map(toBrandAuthorizationResponse);
  }
}
