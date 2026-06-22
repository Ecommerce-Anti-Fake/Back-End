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
  CreateSocialCommentMessage,
  CreateSocialPostMessage,
  CreateBrandMessage,
  CreateCategoryMessage,
  CreateOfferMessage,
  CreateLiveCommentMessage,
  CreateLiveSessionMessage,
  DeleteLiveCommentMessage,
  DeleteOfferDocumentMessage,
  DeleteOfferMediaMessage,
  FavoriteOfferMessage,
  FavoriteOffersLookupMessage,
  LiveSessionLookupMessage,
  ListLiveCommentsMessage,
  ListLiveSessionsMessage,
  ListOffersMessage,
  ListSocialPostsMessage,
  OfferDocumentUploadSignaturesMessage,
  OfferBatchLinksLookupMessage,
  OfferDocumentsLookupMessage,
  OfferMediaLookupMessage,
  OfferMediaUploadSignaturesMessage,
  OfferReviewsLookupMessage,
  OfferLookupMessage,
  ReviewMediaUploadSignaturesMessage,
  SetOfferPrimaryMediaMessage,
  SetSocialReactionMessage,
  SocialPostLookupMessage,
  UpdateSocialPostVisibilityMessage,
  UpdateLiveSessionStatusMessage,
  UpdateLiveCommentVisibilityMessage,
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
  CreateSocialCommentUseCase,
  CreateSocialPostUseCase,
  CreateLiveCommentUseCase,
  CreateLiveSessionUseCase,
  DeleteLiveCommentUseCase,
  DeleteOfferDocumentUseCase,
  DeleteOfferMediaUseCase,
  GetOfferDocumentUploadSignaturesUseCase,
  GetOfferByIdUseCase,
  GetOfferMediaUploadSignaturesUseCase,
  GetReviewMediaUploadSignaturesUseCase,
  ListBrandsUseCase,
  ListCategoriesUseCase,
  ListOfferBatchLinksUseCase,
  ListOfferDocumentsUseCase,
  ListOfferMediaUseCase,
  ListOfferReviewsUseCase,
  ListOffersUseCase,
  ListFavoriteOffersUseCase,
  ListShippingCarriersUseCase,
  ListLiveSessionsUseCase,
  ListLiveCommentsUseCase,
  ListSocialPostsUseCase,
  RemoveSocialReactionUseCase,
  RemindLiveSessionUseCase,
  SetOfferPrimaryMediaUseCase,
  SetSocialReactionUseCase,
  ShareSocialPostUseCase,
  RemoveFavoriteOfferUseCase,
  UpdateSocialPostVisibilityUseCase,
  UpdateLiveSessionStatusUseCase,
  UpdateLiveCommentVisibilityUseCase,
  UpdateOfferUseCase,
} from '../../application/use-cases';

@Controller()
export class ProductsRpcController {
  constructor(
    private readonly listBrandsUseCase: ListBrandsUseCase,
    private readonly createBrandUseCase: CreateBrandUseCase,
    private readonly listCategoriesUseCase: ListCategoriesUseCase,
    private readonly createCategoryUseCase: CreateCategoryUseCase,
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
    private readonly listSocialPostsUseCase: ListSocialPostsUseCase,
    private readonly createSocialPostUseCase: CreateSocialPostUseCase,
    private readonly createSocialCommentUseCase: CreateSocialCommentUseCase,
    private readonly setSocialReactionUseCase: SetSocialReactionUseCase,
    private readonly removeSocialReactionUseCase: RemoveSocialReactionUseCase,
    private readonly shareSocialPostUseCase: ShareSocialPostUseCase,
    private readonly updateSocialPostVisibilityUseCase: UpdateSocialPostVisibilityUseCase,
    private readonly listLiveSessionsUseCase: ListLiveSessionsUseCase,
    private readonly createLiveSessionUseCase: CreateLiveSessionUseCase,
    private readonly updateLiveSessionStatusUseCase: UpdateLiveSessionStatusUseCase,
    private readonly remindLiveSessionUseCase: RemindLiveSessionUseCase,
    private readonly listLiveCommentsUseCase: ListLiveCommentsUseCase,
    private readonly createLiveCommentUseCase: CreateLiveCommentUseCase,
    private readonly updateLiveCommentVisibilityUseCase: UpdateLiveCommentVisibilityUseCase,
    private readonly deleteLiveCommentUseCase: DeleteLiveCommentUseCase,
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
  async findOfferById(@Payload() payload: OfferLookupMessage) {
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

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.listSocialPosts)
  async listSocialPosts(@Payload() payload: ListSocialPostsMessage) {
    try {
      return await this.listSocialPostsUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.createSocialPost)
  async createSocialPost(@Payload() payload: CreateSocialPostMessage) {
    try {
      return await this.createSocialPostUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.createSocialComment)
  async createSocialComment(@Payload() payload: CreateSocialCommentMessage) {
    try {
      return await this.createSocialCommentUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.setSocialReaction)
  async setSocialReaction(@Payload() payload: SetSocialReactionMessage) {
    try {
      return await this.setSocialReactionUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.removeSocialReaction)
  async removeSocialReaction(@Payload() payload: SetSocialReactionMessage) {
    try {
      return await this.removeSocialReactionUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.shareSocialPost)
  async shareSocialPost(@Payload() payload: SocialPostLookupMessage) {
    try {
      return await this.shareSocialPostUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.updateSocialPostVisibility)
  async updateSocialPostVisibility(@Payload() payload: UpdateSocialPostVisibilityMessage) {
    try {
      return await this.updateSocialPostVisibilityUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.listLiveSessions)
  async listLiveSessions(@Payload() payload: ListLiveSessionsMessage) {
    try {
      return await this.listLiveSessionsUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.createLiveSession)
  async createLiveSession(@Payload() payload: CreateLiveSessionMessage) {
    try {
      return await this.createLiveSessionUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.updateLiveSessionStatus)
  async updateLiveSessionStatus(@Payload() payload: UpdateLiveSessionStatusMessage) {
    try {
      return await this.updateLiveSessionStatusUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.remindLiveSession)
  async remindLiveSession(@Payload() payload: LiveSessionLookupMessage) {
    try {
      return await this.remindLiveSessionUseCase.execute({
        sessionId: payload.sessionId,
        requesterUserId: payload.requesterUserId,
      });
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.listLiveComments)
  async listLiveComments(@Payload() payload: ListLiveCommentsMessage) {
    try {
      return await this.listLiveCommentsUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.createLiveComment)
  async createLiveComment(@Payload() payload: CreateLiveCommentMessage) {
    try {
      return await this.createLiveCommentUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.updateLiveCommentVisibility)
  async updateLiveCommentVisibility(@Payload() payload: UpdateLiveCommentVisibilityMessage) {
    try {
      return await this.updateLiveCommentVisibilityUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.deleteLiveComment)
  async deleteLiveComment(@Payload() payload: DeleteLiveCommentMessage) {
    try {
      return await this.deleteLiveCommentUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }
}
