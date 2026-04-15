import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  PRODUCTS_MESSAGE_PATTERNS,
} from '@contracts';
import type {
  CreateOfferMessage,
  ListOffersMessage,
  ProductModelLookupMessage,
} from '@contracts';
import { throwRpcException } from '@common';
import {
  CreateOfferUseCase,
  GetOfferByIdUseCase,
  GetProductModelByIdUseCase,
  ListOffersUseCase,
  ListProductModelsUseCase,
} from '../../application/use-cases';

@Controller()
export class ProductsRpcController {
  constructor(
    private readonly listProductModelsUseCase: ListProductModelsUseCase,
    private readonly getProductModelByIdUseCase: GetProductModelByIdUseCase,
    private readonly createOfferUseCase: CreateOfferUseCase,
    private readonly listOffersUseCase: ListOffersUseCase,
    private readonly getOfferByIdUseCase: GetOfferByIdUseCase,
  ) {}

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.findModels)
  async findModels() {
    try {
      return await this.listProductModelsUseCase.execute();
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.findModelById)
  async findModelById(@Payload() payload: ProductModelLookupMessage) {
    try {
      return await this.getProductModelByIdUseCase.execute(payload.id);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.createOffer)
  async createOffer(@Payload() payload: CreateOfferMessage) {
    try {
      return await this.createOfferUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.findOffers)
  async findOffers(@Payload() payload?: ListOffersMessage) {
    try {
      return await this.listOffersUseCase.execute(payload?.shopId);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.findOfferById)
  async findOfferById(@Payload() payload: ProductModelLookupMessage) {
    try {
      return await this.getOfferByIdUseCase.execute(payload.id);
    } catch (error) {
      throwRpcException(error);
    }
  }
}
