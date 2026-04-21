import { BadRequestException, Injectable } from '@nestjs/common';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';
import { toCategoryResponse } from './products.mapper';

type CreateCategoryInput = {
  name: string;
  parentId?: string | null;
  riskTier?: string;
};

@Injectable()
export class CreateCategoryUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(input: CreateCategoryInput) {
    if (input.parentId) {
      const parent = await this.productRepository.findCategoryById(input.parentId);

      if (!parent) {
        throw new BadRequestException('Parent category not found');
      }
    }

    const category = await this.productRepository.createCategory({
      name: input.name.trim(),
      parentId: input.parentId || null,
      riskTier: input.riskTier?.trim() || 'medium',
    });

    return toCategoryResponse(category);
  }
}
