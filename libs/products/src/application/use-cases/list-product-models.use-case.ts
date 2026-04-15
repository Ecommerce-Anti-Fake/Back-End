import { Injectable } from '@nestjs/common';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';
import { toProductModelResponse } from './products.mapper';

@Injectable()
export class ListProductModelsUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute() {
    const models = await this.productRepository.findAllModels();
    return models.map(toProductModelResponse);
  }
}
