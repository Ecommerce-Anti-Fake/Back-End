import { Injectable } from '@nestjs/common';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';
import { toBrandResponse } from './products.mapper';

type CreateBrandInput = {
  name: string;
  registryStatus?: string;
};

@Injectable()
export class CreateBrandUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(input: CreateBrandInput) {
    const brand = await this.productRepository.createBrand({
      name: input.name.trim(),
      registryStatus: input.registryStatus?.trim() || 'verified',
    });

    return toBrandResponse(brand);
  }
}
