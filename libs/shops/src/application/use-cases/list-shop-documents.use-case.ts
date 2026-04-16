import { Injectable, NotFoundException } from '@nestjs/common';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';
import { toShopDocumentResponse } from './shop-verification.mapper';

@Injectable()
export class ListShopDocumentsUseCase {
  constructor(private readonly shopsRepository: ShopsRepository) {}

  async execute(input: { shopId: string; requesterUserId: string }) {
    const ownedShop = await this.shopsRepository.findOwnedShop(input.shopId, input.requesterUserId);
    if (!ownedShop) {
      throw new NotFoundException('Shop not found');
    }

    const documents = await this.shopsRepository.findShopDocumentsByShopId(input.shopId);
    return documents.map(toShopDocumentResponse);
  }
}
