import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MediaService } from '@media';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';
import { toBrandAuthorizationResponse } from './shops.mapper';

@Injectable()
export class SubmitBrandAuthorizationUseCase {
  constructor(
    private readonly shopsRepository: ShopsRepository,
    private readonly mediaService: MediaService,
  ) {}

  async execute(input: {
    shopId: string;
    brandId: string;
    requesterUserId: string;
    authorizationType: string;
    mimeType: string;
    fileUrl: string;
    publicId: string;
  }) {
    const shop = await this.shopsRepository.findOwnedShop(input.shopId, input.requesterUserId);
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    const brand = await this.shopsRepository.findBrandById(input.brandId);
    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    if (!['MANUFACTURER', 'DISTRIBUTOR'].includes(shop.registrationType)) {
      throw new BadRequestException('Brand authorization is only available for manufacturer or distributor shops');
    }

    if (!this.mediaService.isOwnedCloudinaryUrl(input.fileUrl)) {
      throw new BadRequestException('Brand authorization URL must belong to the configured Cloudinary cloud');
    }

    const publicId = input.publicId.trim();
    if (!publicId.startsWith(`shops/${shop.id}/brands/${input.brandId}/`)) {
      throw new BadRequestException('Brand authorization public ID does not belong to the brand authorization folder');
    }

    const mediaAsset = await this.mediaService.createCloudinaryAsset({
      ownerUserId: input.requesterUserId,
      assetType: 'RAW',
      resourceType: 'SHOP_DOCUMENT',
      publicId,
      secureUrl: input.fileUrl,
      mimeType: input.mimeType.trim().toLowerCase(),
      folder: `shops/${shop.id}/brands/${input.brandId}`,
    });

    const previous = (await this.shopsRepository.findBrandAuthorizationsByShopId(shop.id)).find(
      (item) => item.brandId === input.brandId,
    );

    const authorization = await this.shopsRepository.upsertBrandAuthorization({
      shopId: shop.id,
      brandId: input.brandId,
      mediaAssetId: mediaAsset.id,
      authorizationType: input.authorizationType.trim(),
      fileUrl: input.fileUrl,
    });

    await this.shopsRepository.createAuditLog({
      targetType: 'SHOP_VERIFICATION',
      targetId: shop.id,
      actorUserId: input.requesterUserId,
      action: 'BRAND_AUTHORIZATION_SUBMITTED',
      fromStatus: previous?.verificationStatus ?? null,
      toStatus: 'pending',
      metadata: {
        brandId: input.brandId,
        authorizationId: authorization.id,
      },
    });

    return toBrandAuthorizationResponse(authorization);
  }
}
