import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { throwRpcException } from '@common';
import { PRODUCTS_MESSAGE_PATTERNS } from '@contracts';
import type {
  AddReviewMediaBatchMessage,
  CreateOfferReviewMessage,
  CreateOrderItemReviewMessage,
  OfferReviewsLookupMessage,
  ReviewMediaUploadSignaturesMessage,
} from '@contracts';
import {
  AddReviewMediaBatchUseCase,
  CreateOfferReviewUseCase,
  CreateOrderItemReviewUseCase,
  GetReviewMediaUploadSignaturesUseCase,
  ListOfferReviewsUseCase,
} from '../../application/use-cases';

@Controller()
export class ReviewsRpcController {
  constructor(
    private readonly listOfferReviewsUseCase: ListOfferReviewsUseCase,
    private readonly createOfferReviewUseCase: CreateOfferReviewUseCase,
    private readonly createOrderItemReviewUseCase: CreateOrderItemReviewUseCase,
    private readonly getReviewMediaUploadSignaturesUseCase: GetReviewMediaUploadSignaturesUseCase,
    private readonly addReviewMediaBatchUseCase: AddReviewMediaBatchUseCase,
  ) {}

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.findOfferReviews)
  async findOfferReviews(@Payload() payload: OfferReviewsLookupMessage) {
    try {
      return await this.listOfferReviewsUseCase.execute(payload.offerId);
    } catch (error) {
      throwRpcException(error);
    }
  }
  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.createOfferReview)
  async createOfferReview(@Payload() payload: CreateOfferReviewMessage) {
    try {
      return await this.createOfferReviewUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }
  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.createOrderItemReview)
  async createOrderItemReview(
    @Payload() payload: CreateOrderItemReviewMessage,
  ) {
    try {
      return await this.createOrderItemReviewUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }
  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.getReviewMediaUploadSignatures)
  async getReviewMediaUploadSignatures(
    @Payload() payload: ReviewMediaUploadSignaturesMessage,
  ) {
    try {
      return await this.getReviewMediaUploadSignaturesUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }
  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.addReviewMediaBatch)
  async addReviewMediaBatch(@Payload() payload: AddReviewMediaBatchMessage) {
    try {
      return await this.addReviewMediaBatchUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }
}
