import { BadRequestException, Injectable } from '@nestjs/common';
import { toCategoryResponse } from '../catalog-metadata.mapper';
import { CatalogMetadataRepository } from '../../infrastructure/persistence/catalog-metadata.repository';

type CreateCategoryInput = {
  name: string;
  parentId?: string | null;
  riskTier?: string;
};

@Injectable()
export class CreateCategoryUseCase {
  constructor(
    private readonly catalogMetadataRepository: CatalogMetadataRepository,
  ) {}

  async execute(input: CreateCategoryInput) {
    if (input.parentId) {
      const parent = await this.catalogMetadataRepository.findCategoryById(
        input.parentId,
      );

      if (!parent) {
        throw new BadRequestException('Parent category not found');
      }
    }

    const category = await this.catalogMetadataRepository.createCategory({
      name: input.name.trim(),
      parentId: input.parentId || null,
      riskTier: input.riskTier?.trim() || 'medium',
    });

    return toCategoryResponse(category);
  }
}
