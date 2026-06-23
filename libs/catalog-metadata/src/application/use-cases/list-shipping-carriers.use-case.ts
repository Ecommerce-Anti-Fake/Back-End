import { Injectable } from '@nestjs/common';
import { toShippingCarrierResponse } from '../catalog-metadata.mapper';
import { CatalogMetadataRepository } from '../../infrastructure/persistence/catalog-metadata.repository';

@Injectable()
export class ListShippingCarriersUseCase {
  constructor(
    private readonly catalogMetadataRepository: CatalogMetadataRepository,
  ) {}

  async execute() {
    const carriers =
      await this.catalogMetadataRepository.findActiveShippingCarriers();
    return carriers.map(toShippingCarrierResponse);
  }
}
