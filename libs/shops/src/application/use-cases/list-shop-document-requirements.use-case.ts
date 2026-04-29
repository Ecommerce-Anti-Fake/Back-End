import { Injectable, NotFoundException } from '@nestjs/common';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';

@Injectable()
export class ListShopDocumentRequirementsUseCase {
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
      const requirementId = document.requirementId ?? document.docType;
      latestDocumentByRequirement.set(requirementId, document);
    }

    return {
      shopType: shopType
        ? {
            id: shopType.id,
            code: shopType.code,
            name: shopType.name,
            description: shopType.description,
          }
        : null,
      requirements:
        shopType?.requirements.map((item) => {
          const document =
            latestDocumentByRequirement.get(item.requirementId) ??
            latestDocumentByRequirement.get(item.requirement.code) ??
            null;

          return {
            id: item.requirement.id,
            code: item.requirement.code,
            name: item.requirement.name,
            description: item.requirement.description,
            required: item.required,
            multipleFilesAllowed: item.requirement.multipleFilesAllowed,
            sortOrder: item.sortOrder,
            document: document
              ? {
                  id: document.id,
                  reviewStatus: document.reviewStatus,
                  reviewNote: document.reviewNote,
                  fileCount: document.files?.length ?? 0,
                  uploadedAt: document.uploadedAt,
                }
              : null,
          };
        }) ?? [],
    };
  }
}
