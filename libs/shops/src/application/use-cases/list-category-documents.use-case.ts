import { Injectable, NotFoundException } from '@nestjs/common';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';
import { toShopCategoryDocumentResponse } from './shop-verification.mapper';

@Injectable()
export class ListCategoryDocumentsUseCase {
  constructor(private readonly shopsRepository: ShopsRepository) {}

  async execute(input: { shopId: string; categoryId: string; requesterUserId: string }) {
    const ownedShop = await this.shopsRepository.findOwnedShop(input.shopId, input.requesterUserId);
    if (!ownedShop) {
      throw new NotFoundException('Shop not found');
    }

    const categoryRegistration = await this.shopsRepository.findShopBusinessCategory(input.shopId, input.categoryId);
    if (!categoryRegistration) {
      throw new NotFoundException('Shop category registration not found');
    }

    const documents = await this.shopsRepository.findCategoryDocumentsByShopId(input.shopId, input.categoryId);
    return documents.map(toShopCategoryDocumentResponse);
  }
}
