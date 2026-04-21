import { Injectable } from '@nestjs/common';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';
import { toCategoryResponse } from './products.mapper';

@Injectable()
export class ListCategoriesUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute() {
    const categories = await this.productRepository.findAllCategories();
    return categories.map(toCategoryResponse);
  }
}
