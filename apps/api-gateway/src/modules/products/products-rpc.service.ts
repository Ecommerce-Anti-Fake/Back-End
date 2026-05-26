import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  AllocateOfferBatchesMessage,
  AddOfferDocumentsBatchMessage,
  AddOfferMediaBatchMessage,
  AddReviewMediaBatchMessage,
  CreateOrderItemReviewMessage,
  CreateOfferReviewMessage,
  CreateBrandMessage,
  CreateCategoryMessage,
  CreateOfferMessage,
  CreateProductModelMessage,
  DeleteOfferDocumentMessage,
  DeleteOfferMediaMessage,
  ChatRequesterMessage,
  ChatThreadLookupMessage,
  ListOffersMessage,
  OfferDocumentUploadSignaturesMessage,
  OfferBatchLinksLookupMessage,
  OfferDocumentsLookupMessage,
  OfferMediaLookupMessage,
  OfferMediaUploadSignaturesMessage,
  OfferReviewsLookupMessage,
  PRODUCTS_MESSAGE_PATTERNS,
  ProductModelLookupMessage,
  ReviewMediaUploadSignaturesMessage,
  SendChatMessageMessage,
  SetOfferPrimaryMediaMessage,
  StartChatThreadMessage,
  UpdateOfferMessage,
  CATALOG_SERVICE_CLIENT,
} from '@contracts';
import { throwHttpExceptionFromRpc } from '@common';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class ProductsRpcService {
  constructor(
    @Inject(CATALOG_SERVICE_CLIENT)
    private readonly catalogClient: ClientProxy,
  ) {}

  findModels() {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.findModels, {});
  }

  findBrands() {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.findBrands, {});
  }

  createBrand(payload: CreateBrandMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.createBrand, payload);
  }

  findCategories() {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.findCategories, {});
  }

  createCategory(payload: CreateCategoryMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.createCategory, payload);
  }

  findModelById(payload: ProductModelLookupMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.findModelById, payload);
  }

  createModel(payload: CreateProductModelMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.createModel, payload);
  }

  findShippingCarriers() {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.findShippingCarriers, {});
  }

  createOffer(payload: CreateOfferMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.createOffer, payload);
  }

  updateOffer(payload: UpdateOfferMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.updateOffer, payload);
  }

  allocateOfferBatches(payload: AllocateOfferBatchesMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.allocateOfferBatches, payload);
  }

  findOfferBatchLinks(payload: OfferBatchLinksLookupMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.findOfferBatchLinks, payload);
  }

  getOfferMediaUploadSignatures(payload: OfferMediaUploadSignaturesMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.getOfferMediaUploadSignatures, payload);
  }

  addOfferMediaBatch(payload: AddOfferMediaBatchMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.addOfferMediaBatch, payload);
  }

  findOfferMedia(payload: OfferMediaLookupMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.findOfferMedia, payload);
  }

  deleteOfferMedia(payload: DeleteOfferMediaMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.deleteOfferMedia, payload);
  }

  setOfferPrimaryMedia(payload: SetOfferPrimaryMediaMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.setOfferPrimaryMedia, payload);
  }

  findOfferReviews(payload: OfferReviewsLookupMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.findOfferReviews, payload);
  }

  createOfferReview(payload: CreateOfferReviewMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.createOfferReview, payload);
  }

  createOrderItemReview(payload: CreateOrderItemReviewMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.createOrderItemReview, payload);
  }

  getReviewMediaUploadSignatures(payload: ReviewMediaUploadSignaturesMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.getReviewMediaUploadSignatures, payload);
  }

  addReviewMediaBatch(payload: AddReviewMediaBatchMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.addReviewMediaBatch, payload);
  }

  getOfferDocumentUploadSignatures(payload: OfferDocumentUploadSignaturesMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.getOfferDocumentUploadSignatures, payload);
  }

  addOfferDocumentsBatch(payload: AddOfferDocumentsBatchMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.addOfferDocumentsBatch, payload);
  }

  findOfferDocuments(payload: OfferDocumentsLookupMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.findOfferDocuments, payload);
  }

  deleteOfferDocument(payload: DeleteOfferDocumentMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.deleteOfferDocument, payload);
  }

  findOffers(payload: ListOffersMessage = {}) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.findOffers, payload);
  }

  findOfferById(payload: ProductModelLookupMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.findOfferById, payload);
  }

  findChatThreads(payload: ChatRequesterMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.findChatThreads, payload);
  }

  getChatThread(payload: ChatThreadLookupMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.getChatThread, payload);
  }

  startChatThread(payload: StartChatThreadMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.startChatThread, payload);
  }

  sendChatMessage(payload: SendChatMessageMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.sendChatMessage, payload);
  }

  private async send<TResult>(pattern: string, payload: unknown): Promise<TResult> {
    try {
      return await lastValueFrom(this.catalogClient.send<TResult, unknown>(pattern, payload));
    } catch (error) {
      throwHttpExceptionFromRpc(error);
    }
  }
}
