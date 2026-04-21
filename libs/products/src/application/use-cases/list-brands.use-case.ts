import { Injectable } from '@nestjs/common';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';
import { toBrandResponse } from './products.mapper';

@Injectable()
export class ListBrandsUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute() {
    const brands = await this.productRepository.findAllBrands();
    return brands.map(toBrandResponse);
  }
}
