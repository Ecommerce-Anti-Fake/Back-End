import { Injectable } from '@nestjs/common';
import { toBrandResponse } from '../catalog-metadata.mapper';
import { CatalogMetadataRepository } from '../../infrastructure/persistence/catalog-metadata.repository';

@Injectable()
export class ListBrandsUseCase {
  constructor(
    private readonly catalogMetadataRepository: CatalogMetadataRepository,
  ) {}

  async execute() {
    const brands = await this.catalogMetadataRepository.findAllBrands();
    return brands.map(toBrandResponse);
  }
}
