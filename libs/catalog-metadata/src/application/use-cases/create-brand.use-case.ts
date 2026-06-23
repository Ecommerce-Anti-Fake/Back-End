import { Injectable } from '@nestjs/common';
import { toBrandResponse } from '../catalog-metadata.mapper';
import { CatalogMetadataRepository } from '../../infrastructure/persistence/catalog-metadata.repository';

type CreateBrandInput = {
  name: string;
  registryStatus?: string;
};

@Injectable()
export class CreateBrandUseCase {
  constructor(
    private readonly catalogMetadataRepository: CatalogMetadataRepository,
  ) {}

  async execute(input: CreateBrandInput) {
    const brand = await this.catalogMetadataRepository.createBrand({
      name: input.name.trim(),
      registryStatus: input.registryStatus?.trim() || 'verified',
    });

    return toBrandResponse(brand);
  }
}
