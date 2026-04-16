import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';
import { toShopResponse } from './shops.mapper';

@Injectable()
export class ReviewShopDocumentUseCase {
  constructor(private readonly shopsRepository: ShopsRepository) {}

  async execute(input: {
    shopId: string;
    documentId: string;
    reviewerUserId?: string;
    reviewStatus: 'approved' | 'rejected';
    reviewNote?: string | null;
  }) {
    const document = await this.shopsRepository.findShopDocumentById(input.shopId, input.documentId);
    if (!document) {
      throw new NotFoundException('Shop document not found');
    }

    const result = await this.shopsRepository.reviewShopDocument({
      shopId: input.shopId,
      documentId: input.documentId,
      reviewStatus: input.reviewStatus,
      reviewNote: input.reviewNote?.trim() || null,
    });

    if (result.count === 0) {
      throw new BadRequestException('Shop document review could not be applied');
    }

    const shop = await this.shopsRepository.recomputeShopStatus(input.shopId);
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    await this.shopsRepository.createAuditLog({
      targetType: 'SHOP_VERIFICATION',
      targetId: input.shopId,
      actorUserId: input.reviewerUserId ?? shop.ownerUserId,
      action: 'SHOP_DOCUMENT_REVIEWED',
      fromStatus: document.reviewStatus,
      toStatus: input.reviewStatus,
      note: input.reviewNote?.trim() || null,
      metadata: {
        documentId: input.documentId,
        docType: document.docType,
      },
    });

    return toShopResponse(shop);
  }
}
