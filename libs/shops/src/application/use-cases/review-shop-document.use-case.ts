import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';

@Injectable()
export class ReviewShopDocumentUseCase {
  constructor(private readonly shopsRepository: ShopsRepository) {}

  async execute(input: {
    shopId: string;
    reviewerUserId?: string;
    reviewStatus: 'approved' | 'rejected';
    reviewNote?: string | null;
  }) {
    const shop = await this.shopsRepository.findAdminShopVerificationDetailById(input.shopId);
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    if (shop.documents.length === 0) {
      throw new BadRequestException('Shop legal documents are required before review');
    }

    const hasFrontId = shop.owner.kyc?.documents.some((document) => document.side === 'FRONT') === true;
    const hasBackId = shop.owner.kyc?.documents.some((document) => document.side === 'BACK') === true;
    if (!shop.owner.kyc || !hasFrontId || !hasBackId) {
      throw new BadRequestException('Owner KYC must include front and back ID documents before shop review');
    }

    const requiredRequirementIds = new Set(
      shop.shopType?.requirements
        .filter((item) => item.required)
        .map((item) => item.requirement.id) ?? [],
    );
    const hasAllRequiredDocuments = [...requiredRequirementIds].every((requirementId) =>
      shop.documents.some((document) => document.requirementId === requirementId),
    );
    if (requiredRequirementIds.size === 0 || !hasAllRequiredDocuments) {
      throw new BadRequestException('All required shop legal documents must be submitted before review');
    }

    const reviewResult = await this.shopsRepository.reviewShopDocumentsAndOwnerKyc({
      shopId: shop.id,
      ownerUserId: shop.ownerUserId,
      reviewStatus: input.reviewStatus,
      reviewNote: input.reviewNote?.trim() || null,
    });

    const updatedShop =
      input.reviewStatus === 'rejected'
        ? await this.shopsRepository.updateShopStatus(input.shopId, 'rejected')
        : await this.shopsRepository.recomputeShopStatus(input.shopId);
    if (!updatedShop) {
      throw new NotFoundException('Shop not found');
    }

    await this.shopsRepository.createAuditLog({
      targetType: 'SHOP_VERIFICATION',
      targetId: input.shopId,
      actorUserId: input.reviewerUserId ?? updatedShop.ownerUserId,
      action: 'SHOP_REGISTRATION_REVIEWED',
      fromStatus: shop.shopStatus,
      toStatus: updatedShop.shopStatus,
      note: input.reviewNote?.trim() || null,
      metadata: {
        reviewStatus: input.reviewStatus,
        reviewedKyc: reviewResult.reviewedKyc,
        reviewedShopDocumentIds: reviewResult.reviewedShopDocumentIds,
      },
    });

    return {
      success: true,
      message: 'Shop registration reviewed',
    };
  }
}
