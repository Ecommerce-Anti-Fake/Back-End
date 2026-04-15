import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';
import { toProductModelResponse } from './products.mapper';

@Injectable()
export class GetProductModelByIdUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(id: string) {
    const model = await this.productRepository.findModelById(id);
    if (!model) {
      throw new NotFoundException('Product model not found');
    }

    return toProductModelResponse(model);
  }
}
