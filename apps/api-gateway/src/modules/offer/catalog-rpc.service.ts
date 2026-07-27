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
  BuyNowOfferPreviewMessage,
  DeleteOfferVariantMessage,
  FindOfferVariantsMessage,
  GetLiveSessionMessage,
  GetLiveBroadcastContextMessage,
  GetLiveAnalyticsMessage,
  SyncLiveProviderEventMessage,
  CreateLiveCommentMessage,
  CreateLiveSessionMessage,
  CreateSocialCommentMessage,
  CreateSocialCommentReplyMessage,
  CreateSocialPostMessage,
  DeleteOfferDocumentMessage,
  DeleteOfferMediaMessage,
  DeleteLiveCommentMessage,
  FavoriteOfferMessage,
  FavoriteOffersLookupMessage,
  ChatRequesterMessage,
  ChatThreadLookupMessage,
  ListLiveCommentsMessage,
  ListLiveSessionsMessage,
  ListOffersMessage,
  AdminOffersLookupMessage,
  ListSocialCommentRepliesMessage,
  ListSocialCommentsMessage,
  ListSocialPostsMessage,
  OfferDocumentUploadSignaturesMessage,
  OfferBatchLinksLookupMessage,
  OfferDocumentsLookupMessage,
  OfferMediaLookupMessage,
  OfferMediaUploadSignaturesMessage,
  OfferReviewsLookupMessage,
  OfferLookupMessage,
  PRODUCTS_MESSAGE_PATTERNS,
  ReviewMediaUploadSignaturesMessage,
  SendChatMessageMessage,
  SetOfferPrimaryMediaMessage,
  SetSocialReactionMessage,
  SocialCommentLikeMessage,
  SocialPostLookupMessage,
  StartChatThreadMessage,
  StartShopChatThreadMessage,
  LiveSessionLookupMessage,
  UpdateLiveCommentVisibilityMessage,
  UpdateSocialPostVisibilityMessage,
  UpdateLiveSessionStatusMessage,
  UpdateOfferMessage,
  ModerateOfferMessage,
  UpdateOfferVariantMessage,
  CATALOG_SERVICE_CLIENT,
} from '@contracts';
import { throwHttpExceptionFromRpc } from '@common';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class CatalogRpcService {
  constructor(
    @Inject(CATALOG_SERVICE_CLIENT)
    private readonly catalogClient: ClientProxy,
  ) {}

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

  findShippingCarriers() {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.findShippingCarriers, {});
  }

  createOffer(payload: CreateOfferMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.createOffer, payload);
  }

  findOfferVariants(payload: FindOfferVariantsMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.findOfferVariants, payload);
  }

  updateOfferVariant(payload: UpdateOfferVariantMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.updateOfferVariant, payload);
  }

  deleteOfferVariant(payload: DeleteOfferVariantMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.deleteOfferVariant, payload);
  }

  updateOffer(payload: UpdateOfferMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.updateOffer, payload);
  }

  moderateOffer(payload: ModerateOfferMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.moderateOffer, payload);
  }

  allocateOfferBatches(payload: AllocateOfferBatchesMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.allocateOfferBatches, payload);
  }

  findOfferBatchLinks(payload: OfferBatchLinksLookupMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.findOfferBatchLinks, payload);
  }

  getOfferMediaUploadSignatures(payload: OfferMediaUploadSignaturesMessage) {
    return this.send(
      PRODUCTS_MESSAGE_PATTERNS.getOfferMediaUploadSignatures,
      payload,
    );
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
    return this.send(
      PRODUCTS_MESSAGE_PATTERNS.getReviewMediaUploadSignatures,
      payload,
    );
  }

  addReviewMediaBatch(payload: AddReviewMediaBatchMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.addReviewMediaBatch, payload);
  }

  getOfferDocumentUploadSignatures(
    payload: OfferDocumentUploadSignaturesMessage,
  ) {
    return this.send(
      PRODUCTS_MESSAGE_PATTERNS.getOfferDocumentUploadSignatures,
      payload,
    );
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

  findAdminOffers(payload: AdminOffersLookupMessage = {}) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.findAdminOffers, payload);
  }

  findOfferById(payload: OfferLookupMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.findOfferById, payload);
  }

  getBuyNowOfferPreview(payload: BuyNowOfferPreviewMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.getBuyNowOfferPreview, payload);
  }

  findFavoriteOffers(payload: FavoriteOffersLookupMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.findFavoriteOffers, payload);
  }

  addFavoriteOffer(payload: FavoriteOfferMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.addFavoriteOffer, payload);
  }

  removeFavoriteOffer(payload: FavoriteOfferMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.removeFavoriteOffer, payload);
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

  startShopChatThread(payload: StartShopChatThreadMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.startShopChatThread, payload);
  }

  sendChatMessage(payload: SendChatMessageMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.sendChatMessage, payload);
  }

  listSocialPosts(payload: ListSocialPostsMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.listSocialPosts, payload);
  }

  getSocialPost(payload: SocialPostLookupMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.getSocialPost, payload);
  }

  listSocialComments(payload: ListSocialCommentsMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.listSocialComments, payload);
  }

  listSocialCommentReplies(payload: ListSocialCommentRepliesMessage) {
    return this.send(
      PRODUCTS_MESSAGE_PATTERNS.listSocialCommentReplies,
      payload,
    );
  }

  createSocialPost(payload: CreateSocialPostMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.createSocialPost, payload);
  }

  createSocialComment(payload: CreateSocialCommentMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.createSocialComment, payload);
  }

  createSocialCommentReply(payload: CreateSocialCommentReplyMessage) {
    return this.send(
      PRODUCTS_MESSAGE_PATTERNS.createSocialCommentReply,
      payload,
    );
  }

  setSocialReaction(payload: SetSocialReactionMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.setSocialReaction, payload);
  }

  removeSocialReaction(payload: SetSocialReactionMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.removeSocialReaction, payload);
  }

  setSocialCommentLike(payload: SocialCommentLikeMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.setSocialCommentLike, payload);
  }

  removeSocialCommentLike(payload: SocialCommentLikeMessage) {
    return this.send(
      PRODUCTS_MESSAGE_PATTERNS.removeSocialCommentLike,
      payload,
    );
  }

  shareSocialPost(payload: SocialPostLookupMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.shareSocialPost, payload);
  }

  updateSocialPostVisibility(payload: UpdateSocialPostVisibilityMessage) {
    return this.send(
      PRODUCTS_MESSAGE_PATTERNS.updateSocialPostVisibility,
      payload,
    );
  }

  listLiveSessions(payload: ListLiveSessionsMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.listLiveSessions, payload);
  }

  getLiveSession(payload: GetLiveSessionMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.getLiveSession, payload);
  }

  getLiveBroadcastContext(payload: GetLiveBroadcastContextMessage) {
    return this.send(
      PRODUCTS_MESSAGE_PATTERNS.getLiveBroadcastContext,
      payload,
    );
  }

  getLiveAnalytics(payload: GetLiveAnalyticsMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.getLiveAnalytics, payload);
  }

  syncLiveProviderEvent(payload: SyncLiveProviderEventMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.syncLiveProviderEvent, payload);
  }

  createLiveSession(payload: CreateLiveSessionMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.createLiveSession, payload);
  }

  startLiveSession(payload: LiveSessionLookupMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.startLiveSession, payload);
  }

  updateLiveSessionStatus(payload: UpdateLiveSessionStatusMessage) {
    return this.send(
      PRODUCTS_MESSAGE_PATTERNS.updateLiveSessionStatus,
      payload,
    );
  }

  remindLiveSession(payload: LiveSessionLookupMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.remindLiveSession, payload);
  }

  listLiveComments(payload: ListLiveCommentsMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.listLiveComments, payload);
  }

  createLiveComment(payload: CreateLiveCommentMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.createLiveComment, payload);
  }

  updateLiveCommentVisibility(payload: UpdateLiveCommentVisibilityMessage) {
    return this.send(
      PRODUCTS_MESSAGE_PATTERNS.updateLiveCommentVisibility,
      payload,
    );
  }

  deleteLiveComment(payload: DeleteLiveCommentMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.deleteLiveComment, payload);
  }

  private async send<TResult>(
    pattern: string,
    payload: unknown,
  ): Promise<TResult> {
    try {
      return await lastValueFrom(
        this.catalogClient.send<TResult, unknown>(pattern, payload),
      );
    } catch (error) {
      throwHttpExceptionFromRpc(error);
    }
  }
}
