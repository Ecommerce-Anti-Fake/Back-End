import { BadRequestException, Injectable } from '@nestjs/common';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';
import { toProductModelResponse } from './products.mapper';

type CreateProductModelInput = {
  brandId: string;
  categoryId: string;
  modelName: string;
  gtin?: string | null;
  verificationPolicy?: string;
  approvalStatus?: string;
};

@Injectable()
export class CreateProductModelUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(input: CreateProductModelInput) {
    const brand = await this.productRepository.findBrandById(input.brandId);

    if (!brand) {
      throw new BadRequestException('Brand not found');
    }

    const category = await this.productRepository.findCategoryById(input.categoryId);

    if (!category) {
      throw new BadRequestException('Category not found');
    }

    const model = await this.productRepository.createProductModel({
      brandId: input.brandId,
      categoryId: input.categoryId,
      modelName: input.modelName.trim(),
      gtin: input.gtin?.trim() || null,
      verificationPolicy: input.verificationPolicy?.trim() || 'manual_review',
      approvalStatus: input.approvalStatus?.trim() || 'approved',
    });

    return toProductModelResponse(model);
  }
}
