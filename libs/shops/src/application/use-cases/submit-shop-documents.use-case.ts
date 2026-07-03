import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MediaService } from '@media';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';

const MAX_SHOP_DOCUMENT_BYTES = 5 * 1024 * 1024;
const ALLOWED_SHOP_DOCUMENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

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
      file: {
        buffer: Buffer | { data?: number[] };
        mimetype: string;
        originalname?: string;
        size: number;
      };
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
    const uploadedImages: Array<{ publicId: string; assetType: 'IMAGE' }> = [];

    try {
      for (const [index, item] of input.items.entries()) {
        const file = this.validateDocumentImage(item.file);
        const docType = item.docType.trim();
        if (!docType) {
          throw new BadRequestException('Shop document type is required');
        }

        const uploaded = await this.mediaService.uploadCloudinaryBuffer({
          buffer: file.buffer,
          folder: `shops/${shop.id}/documents`,
          requesterUserId: input.requesterUserId,
          assetType: 'IMAGE',
          mimeType: file.mimetype,
          sequence: index + 1,
        });
        uploadedImages.push({ publicId: uploaded.publicId, assetType: 'IMAGE' });

        const mediaAsset = await this.mediaService.createCloudinaryAsset({
          ownerUserId: input.requesterUserId,
          assetType: 'IMAGE',
          resourceType: 'SHOP_DOCUMENT',
          publicId: uploaded.publicId,
          secureUrl: uploaded.secureUrl,
          mimeType: file.mimetype,
          folder: `shops/${shop.id}/documents`,
        });

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
          fileUrl: uploaded.secureUrl,
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
    } catch (error) {
      await Promise.allSettled(
        uploadedImages.map((image) => this.mediaService.deleteCloudinaryAsset(image)),
      );
      throw error;
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

  private validateDocumentImage(file?: {
    buffer: Buffer | { data?: number[] };
    mimetype: string;
    size: number;
  }) {
    if (!file) {
      throw new BadRequestException('Shop document image is required');
    }

    const mimetype = file.mimetype.trim().toLowerCase();
    if (!ALLOWED_SHOP_DOCUMENT_TYPES.has(mimetype)) {
      throw new BadRequestException('Shop document must be a JPG, PNG, or WEBP image');
    }

    const buffer = normalizeBuffer(file.buffer);
    if (!buffer.length || file.size <= 0) {
      throw new BadRequestException('Shop document image is empty');
    }

    if (file.size > MAX_SHOP_DOCUMENT_BYTES || buffer.length > MAX_SHOP_DOCUMENT_BYTES) {
      throw new BadRequestException('Shop document image is too large');
    }

    return {
      buffer,
      mimetype,
      size: file.size,
    };
  }
}

function normalizeBuffer(buffer: Buffer | { data?: number[] }) {
  if (Buffer.isBuffer(buffer)) {
    return buffer;
  }

  if (Array.isArray(buffer?.data)) {
    return Buffer.from(buffer.data);
  }

  throw new BadRequestException('Shop document image is invalid');
}
