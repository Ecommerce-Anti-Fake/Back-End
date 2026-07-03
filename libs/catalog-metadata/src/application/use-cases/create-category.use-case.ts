import { BadRequestException, Injectable } from '@nestjs/common';
import { MediaService } from '@media';
import { toCategoryResponse } from '../catalog-metadata.mapper';
import { CatalogMetadataRepository } from '../../infrastructure/persistence/catalog-metadata.repository';

const MAX_CATEGORY_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_CATEGORY_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

type CreateCategoryInput = {
  requesterUserId: string;
  name: string;
  parentId?: string | null;
  image?: {
    buffer: Buffer | { data?: number[] };
    mimetype: string;
    originalname?: string;
    size: number;
  };
  riskTier?: string;
};

@Injectable()
export class CreateCategoryUseCase {
  constructor(
    private readonly catalogMetadataRepository: CatalogMetadataRepository,
    private readonly mediaService: MediaService,
  ) {}

  async execute(input: CreateCategoryInput) {
    const image = this.validateCategoryImage(input.image);

    if (input.parentId) {
      const parent = await this.catalogMetadataRepository.findCategoryById(
        input.parentId,
      );

      if (!parent) {
        throw new BadRequestException('Parent category not found');
      }
    }

    const uploaded = await this.mediaService.uploadCloudinaryBuffer({
      buffer: image.buffer,
      folder: 'categories',
      requesterUserId: input.requesterUserId,
      assetType: 'IMAGE',
      mimeType: image.mimetype,
    });

    try {
      const category = await this.catalogMetadataRepository.createCategory({
        name: input.name.trim(),
        parentId: input.parentId || null,
        imageUrl: uploaded.secureUrl,
        riskTier: input.riskTier?.trim() || 'medium',
      });

      return toCategoryResponse(category);
    } catch (error) {
      await this.mediaService.deleteCloudinaryAsset({
        publicId: uploaded.publicId,
        assetType: 'IMAGE',
      });
      throw error;
    }
  }

  private validateCategoryImage(image: CreateCategoryInput['image']) {
    if (!image) {
      throw new BadRequestException('Category image is required');
    }

    if (!ALLOWED_CATEGORY_IMAGE_TYPES.has(image.mimetype)) {
      throw new BadRequestException('Category image must be JPG, PNG, or WEBP');
    }

    if (image.size > MAX_CATEGORY_IMAGE_BYTES) {
      throw new BadRequestException('Category image must be 5MB or smaller');
    }

    return {
      ...image,
      buffer: Buffer.isBuffer(image.buffer)
        ? image.buffer
        : Buffer.from(image.buffer.data ?? []),
    };
  }
}
