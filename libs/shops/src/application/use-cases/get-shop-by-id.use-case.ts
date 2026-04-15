import { Injectable, NotFoundException } from '@nestjs/common';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';
import { toShopResponse } from './shops.mapper';

@Injectable()
export class GetShopByIdUseCase {
  constructor(private readonly shopsRepository: ShopsRepository) {}

  async execute(id: string) {
    const shop = await this.shopsRepository.findById(id);
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    return toShopResponse(shop);
  }
}
