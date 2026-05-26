import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  PRODUCTS_MESSAGE_PATTERNS,
} from '@contracts';
import type {
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
  FavoriteOfferMessage,
  FavoriteOffersLookupMessage,
  ChatRequesterMessage,
  ChatThreadLookupMessage,
  ListOffersMessage,
  OfferDocumentUploadSignaturesMessage,
  OfferBatchLinksLookupMessage,
  OfferDocumentsLookupMessage,
  OfferMediaLookupMessage,
  OfferMediaUploadSignaturesMessage,
  OfferReviewsLookupMessage,
  ProductModelLookupMessage,
  ReviewMediaUploadSignaturesMessage,
  SendChatMessageMessage,
  SetOfferPrimaryMediaMessage,
  StartChatThreadMessage,
  UpdateOfferMessage,
} from '@contracts';
import { throwRpcException } from '@common';
import {
  AllocateOfferBatchesUseCase,
  AddOfferDocumentsBatchUseCase,
  AddOfferMediaBatchUseCase,
  AddReviewMediaBatchUseCase,
  AddFavoriteOfferUseCase,
  CreateBrandUseCase,
  CreateCategoryUseCase,
  CreateOfferUseCase,
  CreateOfferReviewUseCase,
  CreateOrderItemReviewUseCase,
  CreateProductModelUseCase,
  DeleteOfferDocumentUseCase,
  DeleteOfferMediaUseCase,
  GetOfferDocumentUploadSignaturesUseCase,
  GetOfferByIdUseCase,
  GetOfferMediaUploadSignaturesUseCase,
  GetChatThreadUseCase,
  GetProductModelByIdUseCase,
  GetReviewMediaUploadSignaturesUseCase,
  ListBrandsUseCase,
  ListCategoriesUseCase,
  ListChatThreadsUseCase,
  ListOfferBatchLinksUseCase,
  ListOfferDocumentsUseCase,
  ListOfferMediaUseCase,
  ListOfferReviewsUseCase,
  ListOffersUseCase,
  ListFavoriteOffersUseCase,
  ListProductModelsUseCase,
  ListShippingCarriersUseCase,
  SetOfferPrimaryMediaUseCase,
  SendChatMessageUseCase,
  StartChatThreadUseCase,
  RemoveFavoriteOfferUseCase,
  UpdateOfferUseCase,
} from '../../application/use-cases';

@Controller()
export class ProductsRpcController {
  constructor(
    private readonly listProductModelsUseCase: ListProductModelsUseCase,
    private readonly listBrandsUseCase: ListBrandsUseCase,
    private readonly createBrandUseCase: CreateBrandUseCase,
    private readonly listCategoriesUseCase: ListCategoriesUseCase,
    private readonly createCategoryUseCase: CreateCategoryUseCase,
    private readonly getProductModelByIdUseCase: GetProductModelByIdUseCase,
    private readonly createProductModelUseCase: CreateProductModelUseCase,
    private readonly listShippingCarriersUseCase: ListShippingCarriersUseCase,
    private readonly createOfferUseCase: CreateOfferUseCase,
    private readonly updateOfferUseCase: UpdateOfferUseCase,
    private readonly allocateOfferBatchesUseCase: AllocateOfferBatchesUseCase,
    private readonly getOfferMediaUploadSignaturesUseCase: GetOfferMediaUploadSignaturesUseCase,
    private readonly addOfferMediaBatchUseCase: AddOfferMediaBatchUseCase,
    private readonly listOfferMediaUseCase: ListOfferMediaUseCase,
    private readonly deleteOfferMediaUseCase: DeleteOfferMediaUseCase,
    private readonly setOfferPrimaryMediaUseCase: SetOfferPrimaryMediaUseCase,
    private readonly listOfferReviewsUseCase: ListOfferReviewsUseCase,
    private readonly createOfferReviewUseCase: CreateOfferReviewUseCase,
    private readonly createOrderItemReviewUseCase: CreateOrderItemReviewUseCase,
    private readonly getReviewMediaUploadSignaturesUseCase: GetReviewMediaUploadSignaturesUseCase,
    private readonly addReviewMediaBatchUseCase: AddReviewMediaBatchUseCase,
    private readonly listOfferBatchLinksUseCase: ListOfferBatchLinksUseCase,
    private readonly getOfferDocumentUploadSignaturesUseCase: GetOfferDocumentUploadSignaturesUseCase,
    private readonly addOfferDocumentsBatchUseCase: AddOfferDocumentsBatchUseCase,
    private readonly listOfferDocumentsUseCase: ListOfferDocumentsUseCase,
    private readonly deleteOfferDocumentUseCase: DeleteOfferDocumentUseCase,
    private readonly listOffersUseCase: ListOffersUseCase,
    private readonly getOfferByIdUseCase: GetOfferByIdUseCase,
    private readonly listFavoriteOffersUseCase: ListFavoriteOffersUseCase,
    private readonly addFavoriteOfferUseCase: AddFavoriteOfferUseCase,
    private readonly removeFavoriteOfferUseCase: RemoveFavoriteOfferUseCase,
    private readonly listChatThreadsUseCase: ListChatThreadsUseCase,
    private readonly getChatThreadUseCase: GetChatThreadUseCase,
    private readonly startChatThreadUseCase: StartChatThreadUseCase,
    private readonly sendChatMessageUseCase: SendChatMessageUseCase,
  ) {}

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.findModels)
  async findModels() {
    try {
      return await this.listProductModelsUseCase.execute();
    } catch (error) {
      throwRpcException(error);
    }
  }

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

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.findModelById)
  async findModelById(@Payload() payload: ProductModelLookupMessage) {
    try {
      return await this.getProductModelByIdUseCase.execute(payload.id);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.createModel)
  async createModel(@Payload() payload: CreateProductModelMessage) {
    try {
      return await this.createProductModelUseCase.execute(payload);
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

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.createOffer)
  async createOffer(@Payload() payload: CreateOfferMessage) {
    try {
      return await this.createOfferUseCase.execute(payload);
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

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.getOfferMediaUploadSignatures)
  async getOfferMediaUploadSignatures(@Payload() payload: OfferMediaUploadSignaturesMessage) {
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
      return await this.listOfferMediaUseCase.execute(payload.offerId);
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
  async createOrderItemReview(@Payload() payload: CreateOrderItemReviewMessage) {
    try {
      return await this.createOrderItemReviewUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.getReviewMediaUploadSignatures)
  async getReviewMediaUploadSignatures(@Payload() payload: ReviewMediaUploadSignaturesMessage) {
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

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.getOfferDocumentUploadSignatures)
  async getOfferDocumentUploadSignatures(@Payload() payload: OfferDocumentUploadSignaturesMessage) {
    try {
      return await this.getOfferDocumentUploadSignaturesUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.addOfferDocumentsBatch)
  async addOfferDocumentsBatch(@Payload() payload: AddOfferDocumentsBatchMessage) {
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

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.findOffers)
  async findOffers(@Payload() payload?: ListOffersMessage) {
    try {
      return await this.listOffersUseCase.execute(payload ?? {});
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

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.findFavoriteOffers)
  async findFavoriteOffers(@Payload() payload: FavoriteOffersLookupMessage) {
    try {
      return await this.listFavoriteOffersUseCase.execute(payload.userId);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.addFavoriteOffer)
  async addFavoriteOffer(@Payload() payload: FavoriteOfferMessage) {
    try {
      return await this.addFavoriteOfferUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.removeFavoriteOffer)
  async removeFavoriteOffer(@Payload() payload: FavoriteOfferMessage) {
    try {
      return await this.removeFavoriteOfferUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.findChatThreads)
  async findChatThreads(@Payload() payload: ChatRequesterMessage) {
    try {
      return await this.listChatThreadsUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.getChatThread)
  async getChatThread(@Payload() payload: ChatThreadLookupMessage) {
    try {
      return await this.getChatThreadUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.startChatThread)
  async startChatThread(@Payload() payload: StartChatThreadMessage) {
    try {
      return await this.startChatThreadUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.sendChatMessage)
  async sendChatMessage(@Payload() payload: SendChatMessageMessage) {
    try {
      return await this.sendChatMessageUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }
}
