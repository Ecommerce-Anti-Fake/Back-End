import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MediaService } from '@media';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';

@Injectable()
export class SubmitShopDocumentsUseCase {
  constructor(
    private readonly shopsRepository: ShopsRepository,
    private readonly mediaService: MediaService,
  ) {}

  async execute(input: {
    shopId: string;
    requesterUserId: string;
    items: Array<{
      docType: string;
      mimeType: string;
      fileUrl: string;
      publicId: string;
    }>;
  }) {
    const shop = await this.shopsRepository.findOwnedShop(input.shopId, input.requesterUserId);
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    if (input.items.length === 0) {
      throw new BadRequestException('At least one shop document is required');
    }

    const documentFilesByType = new Map<
      string,
      Array<{
        mediaAssetId: string;
        fileUrl: string;
      }>
    >();
    const requirementByType = new Map<string, string | null>();

    for (const item of input.items) {
      if (!this.mediaService.isOwnedCloudinaryUrl(item.fileUrl)) {
        throw new BadRequestException('Shop document URL must belong to the configured Cloudinary cloud');
      }

      const publicId = item.publicId.trim();
      if (!publicId.startsWith(`shops/${shop.id}/documents/`)) {
        throw new BadRequestException('Shop document public ID does not belong to the shop documents folder');
      }

      const mediaAsset = await this.mediaService.createCloudinaryAsset({
        ownerUserId: input.requesterUserId,
        assetType: 'IMAGE',
        resourceType: 'SHOP_DOCUMENT',
        publicId,
        secureUrl: item.fileUrl,
        mimeType: item.mimeType.trim().toLowerCase(),
        folder: `shops/${shop.id}/documents`,
      });

      const docType = item.docType.trim();
      if (!requirementByType.has(docType)) {
        const shopRequirement = await this.shopsRepository.findRequirementForShopType({
          shopTypeId: shop.shopTypeId,
          requirementCode: docType,
        });
        requirementByType.set(docType, shopRequirement?.requirement.id ?? null);
      }
      const documentFiles = documentFilesByType.get(docType) ?? [];
      documentFiles.push({
        mediaAssetId: mediaAsset.id,
        fileUrl: item.fileUrl,
      });
      documentFilesByType.set(docType, documentFiles);
    }

    for (const [docType, files] of documentFilesByType.entries()) {
      await this.shopsRepository.createShopDocument({
        shopId: shop.id,
        requirementId: requirementByType.get(docType) ?? null,
        docType,
        files,
      });
    }

    await this.shopsRepository.createAuditLog({
      targetType: 'SHOP_VERIFICATION',
      targetId: shop.id,
      actorUserId: input.requesterUserId,
      action: 'SHOP_DOCUMENT_SUBMITTED',
      note: `${input.items.length} document(s) submitted`,
      metadata: {
        docTypes: input.items.map((item) => item.docType.trim()),
      },
    });

    return this.shopsRepository.recomputeShopStatus(shop.id);
  }
}
