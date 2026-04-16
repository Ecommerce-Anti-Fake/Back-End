import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';
import { toShopResponse } from './shops.mapper';

@Injectable()
export class ReviewShopCategoryUseCase {
  constructor(private readonly shopsRepository: ShopsRepository) {}

  async execute(input: {
    shopId: string;
    categoryId: string;
    reviewerUserId?: string;
    registrationStatus: 'approved' | 'rejected';
    reviewNote?: string | null;
  }) {
    const registration = await this.shopsRepository.findShopBusinessCategory(input.shopId, input.categoryId);
    if (!registration) {
      throw new NotFoundException('Shop category registration not found');
    }

    const result = await this.shopsRepository.reviewShopCategory({
      shopId: input.shopId,
      categoryId: input.categoryId,
      registrationStatus: input.registrationStatus,
      reviewNote: input.reviewNote?.trim() || null,
    });

    if (result.count === 0) {
      throw new BadRequestException('Shop category review could not be applied');
    }

    const shop = await this.shopsRepository.recomputeShopStatus(input.shopId);
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    await this.shopsRepository.createAuditLog({
      targetType: 'SHOP_VERIFICATION',
      targetId: input.shopId,
      actorUserId: input.reviewerUserId ?? shop.ownerUserId,
      action: 'CATEGORY_REVIEWED',
      fromStatus: registration.registrationStatus,
      toStatus: input.registrationStatus,
      note: input.reviewNote?.trim() || null,
      metadata: {
        categoryId: input.categoryId,
      },
    });

    return toShopResponse(shop);
  }
}
