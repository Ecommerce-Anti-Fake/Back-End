import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { throwRpcException } from '@common';
import { PRODUCTS_MESSAGE_PATTERNS } from '@contracts';
import type {
  CreateBrandMessage,
  CreateCategoryMessage,
  VerifyProductMessage,
} from '@contracts';
import {
  CreateBrandUseCase,
  CreateCategoryUseCase,
  ListBrandsUseCase,
  ListCategoriesUseCase,
  ListShippingCarriersUseCase,
  VerifyProductUseCase,
} from '../../application/use-cases';

@Controller()
export class CatalogMetadataRpcController {
  constructor(
    private readonly listBrandsUseCase: ListBrandsUseCase,
    private readonly createBrandUseCase: CreateBrandUseCase,
    private readonly listCategoriesUseCase: ListCategoriesUseCase,
    private readonly createCategoryUseCase: CreateCategoryUseCase,
    private readonly listShippingCarriersUseCase: ListShippingCarriersUseCase,
    private readonly verifyProductUseCase: VerifyProductUseCase,
  ) {}

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.findBrands)
  async findBrands() {
    try {
      return await this.listBrandsUseCase.execute();
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.createBrand)
  async createBrand(@Payload() payload: CreateBrandMessage) {
    try {
      return await this.createBrandUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.findCategories)
  async findCategories() {
    try {
      return await this.listCategoriesUseCase.execute();
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.createCategory)
  async createCategory(@Payload() payload: CreateCategoryMessage) {
    try {
      return await this.createCategoryUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.findShippingCarriers)
  async findShippingCarriers() {
    try {
      return await this.listShippingCarriersUseCase.execute();
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.verifyProduct)
  async verifyProduct(@Payload() payload: VerifyProductMessage) {
    try {
      return await this.verifyProductUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }
}
