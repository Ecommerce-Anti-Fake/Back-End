import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MediaService } from '@media';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';

@Injectable()
export class SubmitCategoryDocumentsUseCase {
  constructor(
    private readonly shopsRepository: ShopsRepository,
    private readonly mediaService: MediaService,
  ) {}

  async execute(input: {
    shopId: string;
    categoryId: string;
    requesterUserId: string;
    items: Array<{
      documentType: string;
      mimeType: string;
      fileUrl: string;
      publicId: string;
      documentNumber?: string | null;
      issuedBy?: string | null;
      issuedAt?: string | null;
      expiresAt?: string | null;
    }>;
  }) {
    const shop = await this.shopsRepository.findOwnedShop(input.shopId, input.requesterUserId);
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    const registration = await this.shopsRepository.findShopBusinessCategory(input.shopId, input.categoryId);
    if (!registration) {
      throw new NotFoundException('Shop category registration not found');
    }

    const previousStatus = registration.registrationStatus;

    if (input.items.length === 0) {
      throw new BadRequestException('At least one category document is required');
    }

    if (registration.registrationStatus === 'rejected') {
      await this.shopsRepository.markShopCategoryPendingReview(input.shopId, input.categoryId);
    }

    for (const item of input.items) {
      if (!this.mediaService.isOwnedCloudinaryUrl(item.fileUrl)) {
        throw new BadRequestException('Category document URL must belong to the configured Cloudinary cloud');
      }

      const publicId = item.publicId.trim();
      if (!publicId.startsWith(`shops/${shop.id}/categories/${input.categoryId}/`)) {
        throw new BadRequestException('Category document public ID does not belong to the category documents folder');
      }

      const mediaAsset = await this.mediaService.createCloudinaryAsset({
        ownerUserId: input.requesterUserId,
        assetType: 'IMAGE',
        resourceType: 'SHOP_DOCUMENT',
        publicId,
        secureUrl: item.fileUrl,
        mimeType: item.mimeType.trim().toLowerCase(),
        folder: `shops/${shop.id}/categories/${input.categoryId}`,
      });

      await this.shopsRepository.createCategoryDocument({
        shopBusinessCategoryId: registration.id,
        mediaAssetId: mediaAsset.id,
        documentType: item.documentType.trim(),
        fileUrl: item.fileUrl,
        documentNumber: item.documentNumber?.trim() || null,
        issuedBy: item.issuedBy?.trim() || null,
        issuedAt: item.issuedAt ? new Date(item.issuedAt) : null,
        expiresAt: item.expiresAt ? new Date(item.expiresAt) : null,
      });
    }

    await this.shopsRepository.createAuditLog({
      targetType: 'SHOP_VERIFICATION',
      targetId: shop.id,
      actorUserId: input.requesterUserId,
      action: 'CATEGORY_DOCUMENT_SUBMITTED',
      fromStatus: previousStatus,
      toStatus: previousStatus === 'rejected' ? 'pending' : previousStatus,
      note: `${input.items.length} document(s) submitted for category ${input.categoryId}`,
      metadata: {
        categoryId: input.categoryId,
        documentTypes: input.items.map((item) => item.documentType.trim()),
      },
    });

    return this.shopsRepository.recomputeShopStatus(shop.id);
  }
}
