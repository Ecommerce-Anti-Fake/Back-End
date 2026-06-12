import { Injectable, NotFoundException } from '@nestjs/common';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';

@Injectable()
export class GetPublicShopByOfferUseCase {
  constructor(private readonly shopsRepository: ShopsRepository) {}

  async execute(offerId: string) {
    const shop = await this.shopsRepository.findPublicShopSummaryByOfferId(offerId);
    if (!shop) {
      throw new NotFoundException('Shop not found for offer');
    }

    return shop;
  }
}
