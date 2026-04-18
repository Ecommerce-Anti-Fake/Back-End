import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';
import { toBrandAuthorizationResponse } from './shops.mapper';

@Injectable()
export class ReviewBrandAuthorizationUseCase {
  constructor(private readonly shopsRepository: ShopsRepository) {}

  async execute(input: {
    authorizationId: string;
    reviewerUserId: string;
    verificationStatus: 'approved' | 'rejected';
    reviewNote?: string | null;
  }) {
    const authorization = await this.shopsRepository.findBrandAuthorizationById(input.authorizationId);
    if (!authorization) {
      throw new NotFoundException('Brand authorization not found');
    }

    const updated = await this.shopsRepository.reviewBrandAuthorization({
      authorizationId: input.authorizationId,
      verificationStatus: input.verificationStatus,
      reviewNote: input.reviewNote?.trim() || null,
    });

    if (!updated) {
      throw new BadRequestException('Brand authorization review could not be applied');
    }

    await this.shopsRepository.createAuditLog({
      targetType: 'SHOP_VERIFICATION',
      targetId: authorization.shopId,
      actorUserId: input.reviewerUserId,
      action: 'BRAND_AUTHORIZATION_REVIEWED',
      fromStatus: authorization.verificationStatus,
      toStatus: input.verificationStatus,
      note: input.reviewNote?.trim() || null,
      metadata: {
        brandId: authorization.brandId,
        authorizationId: authorization.id,
      },
    });

    return toBrandAuthorizationResponse(updated);
  }
}
