import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { throwRpcException } from '@common';
import { PRODUCTS_MESSAGE_PATTERNS } from '@contracts';
import type {
  AddOfferDocumentsBatchMessage,
  AddOfferMediaBatchMessage,
  DeleteOfferDocumentMessage,
  DeleteOfferMediaMessage,
  OfferDocumentUploadSignaturesMessage,
  OfferDocumentsLookupMessage,
  OfferMediaLookupMessage,
  OfferMediaUploadSignaturesMessage,
  SetOfferPrimaryMediaMessage,
} from '@contracts';
import {
  AddOfferDocumentsBatchUseCase,
  AddOfferMediaBatchUseCase,
  DeleteOfferDocumentUseCase,
  DeleteOfferMediaUseCase,
  GetOfferDocumentUploadSignaturesUseCase,
  GetOfferMediaUploadSignaturesUseCase,
  ListOfferDocumentsUseCase,
  ListOfferMediaUseCase,
  SetOfferPrimaryMediaUseCase,
} from '../../application/use-cases';

@Controller()
export class OfferAssetsRpcController {
  constructor(
    private readonly getOfferMediaUploadSignaturesUseCase: GetOfferMediaUploadSignaturesUseCase,
    private readonly addOfferMediaBatchUseCase: AddOfferMediaBatchUseCase,
    private readonly listOfferMediaUseCase: ListOfferMediaUseCase,
    private readonly deleteOfferMediaUseCase: DeleteOfferMediaUseCase,
    private readonly setOfferPrimaryMediaUseCase: SetOfferPrimaryMediaUseCase,
    private readonly getOfferDocumentUploadSignaturesUseCase: GetOfferDocumentUploadSignaturesUseCase,
    private readonly addOfferDocumentsBatchUseCase: AddOfferDocumentsBatchUseCase,
    private readonly listOfferDocumentsUseCase: ListOfferDocumentsUseCase,
    private readonly deleteOfferDocumentUseCase: DeleteOfferDocumentUseCase,
  ) {}
  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.getOfferMediaUploadSignatures)
  async getOfferMediaUploadSignatures(
    @Payload() payload: OfferMediaUploadSignaturesMessage,
  ) {
    try {
      return await this.getOfferMediaUploadSignaturesUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }
  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.addOfferMediaBatch)
  async addOfferMediaBatch(@Payload() payload: AddOfferMediaBatchMessage) {
    try {
      return await this.addOfferMediaBatchUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }
  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.findOfferMedia)
  async findOfferMedia(@Payload() payload: OfferMediaLookupMessage) {
    try {
      return await this.listOfferMediaUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }
  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.deleteOfferMedia)
  async deleteOfferMedia(@Payload() payload: DeleteOfferMediaMessage) {
    try {
      return await this.deleteOfferMediaUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }
  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.setOfferPrimaryMedia)
  async setOfferPrimaryMedia(@Payload() payload: SetOfferPrimaryMediaMessage) {
    try {
      return await this.setOfferPrimaryMediaUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }
  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.getOfferDocumentUploadSignatures)
  async getOfferDocumentUploadSignatures(
    @Payload() payload: OfferDocumentUploadSignaturesMessage,
  ) {
    try {
      return await this.getOfferDocumentUploadSignaturesUseCase.execute(
        payload,
      );
    } catch (error) {
      throwRpcException(error);
    }
  }
  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.addOfferDocumentsBatch)
  async addOfferDocumentsBatch(
    @Payload() payload: AddOfferDocumentsBatchMessage,
  ) {
    try {
      return await this.addOfferDocumentsBatchUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }
  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.findOfferDocuments)
  async findOfferDocuments(@Payload() payload: OfferDocumentsLookupMessage) {
    try {
      return await this.listOfferDocumentsUseCase.execute(payload.offerId);
    } catch (error) {
      throwRpcException(error);
    }
  }
  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.deleteOfferDocument)
  async deleteOfferDocument(@Payload() payload: DeleteOfferDocumentMessage) {
    try {
      return await this.deleteOfferDocumentUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }
}
