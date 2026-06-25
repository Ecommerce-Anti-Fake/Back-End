import { Injectable, NotFoundException } from '@nestjs/common';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';

@Injectable()
export class ListPublicShopCategoriesUseCase {
  constructor(private readonly shopsRepository: ShopsRepository) {}

  async execute(shopId: string) {
    const categories = await this.shopsRepository.findPublicShopCategoriesByShopId(shopId);
    if (!categories) {
      throw new NotFoundException('Shop not found');
    }

    return categories;
  }
}
