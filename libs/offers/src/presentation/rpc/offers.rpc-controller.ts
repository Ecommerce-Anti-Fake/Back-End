import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PRODUCTS_MESSAGE_PATTERNS } from '@contracts';
import type {
  AllocateOfferBatchesMessage,
  CreateOfferMessage,
  CreateOfferVariantMessage,
  ListOffersMessage,
  AdminOffersLookupMessage,
  OfferBatchLinksLookupMessage,
  OfferLookupMessage,
  UpdateOfferMessage,
  ModerateOfferMessage,
} from '@contracts';
import { throwRpcException } from '@common';
import {
  AllocateOfferBatchesUseCase,
  CreateOfferUseCase,
  CreateOfferVariantUseCase,
  GetOfferByIdUseCase,
  ListOfferBatchLinksUseCase,
  ListOffersUseCase,
  ListAdminOffersUseCase,
  UpdateOfferUseCase,
  ModerateOfferUseCase,
} from '../../application/use-cases';

@Controller()
export class OffersRpcController {
  constructor(
    private readonly createOfferUseCase: CreateOfferUseCase,
    private readonly createOfferVariantUseCase: CreateOfferVariantUseCase,
    private readonly updateOfferUseCase: UpdateOfferUseCase,
    private readonly moderateOfferUseCase: ModerateOfferUseCase,
    private readonly allocateOfferBatchesUseCase: AllocateOfferBatchesUseCase,
    private readonly listOfferBatchLinksUseCase: ListOfferBatchLinksUseCase,
    private readonly listOffersUseCase: ListOffersUseCase,
    private readonly listAdminOffersUseCase: ListAdminOffersUseCase,
    private readonly getOfferByIdUseCase: GetOfferByIdUseCase,
  ) {}

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.createOffer)
  async createOffer(@Payload() payload: CreateOfferMessage) {
    try {
      return await this.createOfferUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.createOfferVariant)
  async createOfferVariant(@Payload() payload: CreateOfferVariantMessage) {
    try {
      return await this.createOfferVariantUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.moderateOffer)
  async moderateOffer(@Payload() payload: ModerateOfferMessage) {
    try {
      return await this.moderateOfferUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.updateOffer)
  async updateOffer(@Payload() payload: UpdateOfferMessage) {
    try {
      return await this.updateOfferUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.allocateOfferBatches)
  async allocateOfferBatches(@Payload() payload: AllocateOfferBatchesMessage) {
    try {
      return await this.allocateOfferBatchesUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.findOfferBatchLinks)
  async findOfferBatchLinks(@Payload() payload: OfferBatchLinksLookupMessage) {
    try {
      return await this.listOfferBatchLinksUseCase.execute(payload.offerId);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.findOffers)
  async findOffers(@Payload() payload?: ListOffersMessage) {
    try {
      return await this.listOffersUseCase.execute(payload ?? {});
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.findAdminOffers)
  async findAdminOffers(@Payload() payload?: AdminOffersLookupMessage) {
    try {
      return await this.listAdminOffersUseCase.execute(payload ?? {});
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.findOfferById)
  async findOfferById(@Payload() payload: OfferLookupMessage) {
    try {
      return await this.getOfferByIdUseCase.execute(payload.id);
    } catch (error) {
      throwRpcException(error);
    }
  }
}
