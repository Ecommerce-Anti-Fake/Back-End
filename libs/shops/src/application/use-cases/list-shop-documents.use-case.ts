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

    const [shopType, documents] = await Promise.all([
      this.shopsRepository.findDocumentRequirementsForShop(input.shopId),
      this.shopsRepository.findShopDocumentsByShopId(input.shopId),
    ]);

    const latestDocumentByRequirement = new Map<string, (typeof documents)[number]>();
    for (const document of documents) {
      for (const key of [document.requirementId, document.docType]) {
        if (!key) {
          continue;
        }

        const current = latestDocumentByRequirement.get(key);
        if (!current || document.uploadedAt > current.uploadedAt) {
          latestDocumentByRequirement.set(key, document);
        }
      }
    }

    return (shopType?.requirements ?? [])
      .map(
        (item) =>
          latestDocumentByRequirement.get(item.requirementId) ??
          latestDocumentByRequirement.get(item.requirement.code),
      )
      .filter((document): document is (typeof documents)[number] => document !== undefined)
      .map(toShopDocumentResponse);
  }
}
