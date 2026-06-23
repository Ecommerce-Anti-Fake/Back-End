import { Injectable } from '@nestjs/common';
import { toCategoryResponse } from '../catalog-metadata.mapper';
import { CatalogMetadataRepository } from '../../infrastructure/persistence/catalog-metadata.repository';

@Injectable()
export class ListCategoriesUseCase {
  constructor(
    private readonly catalogMetadataRepository: CatalogMetadataRepository,
  ) {}

  async execute() {
    const categories = await this.catalogMetadataRepository.findAllCategories();
    return categories.map(toCategoryResponse);
  }
}
