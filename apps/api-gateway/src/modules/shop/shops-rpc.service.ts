import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { measureServiceCall } from '@common/performance/request-context';
import {
  AdminBrandAuthorizationsLookupMessage,
  AdminShopRegistrationDetailMessage,
  AdminShopVerificationDetailMessage,
  AdminShopVerificationSummaryMessage,
  BrandAuthorizationUploadSignaturesMessage,
  BrandAuthorizationsLookupMessage,
  CATALOG_SERVICE_CLIENT,
  CreateShopMessage,
  MyShopsLookupMessage,
  PendingVerificationShopsLookupMessage,
  PublicShopsLookupMessage,
  ReviewBrandAuthorizationMessage,
  ReviewShopDocumentMessage,
  SHOPS_MESSAGE_PATTERNS,
  ShopByOfferLookupMessage,
  ShopCategoriesLookupMessage,
  ShopDocumentRequirementsLookupMessage,
  ShopDocumentsLookupMessage,
  ShopDocumentUploadSignaturesMessage,
  ShopLookupMessage,
  ShopVerificationSummaryMessage,
  SubmitBrandAuthorizationMessage,
  SubmitShopDocumentsMessage,
  UpdateShopRegistrationTypeMessage,
  UpdateShopProfileMessage,
} from '@contracts';
import { throwHttpExceptionFromRpc } from '@common';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class ShopsRpcService {
  constructor(
    @Inject(CATALOG_SERVICE_CLIENT)
    private readonly catalogClient: ClientProxy,
  ) {}

  create(payload: CreateShopMessage) {
    return this.send(SHOPS_MESSAGE_PATTERNS.create, payload);
  }

  updateProfile(payload: UpdateShopProfileMessage) {
    return this.send(SHOPS_MESSAGE_PATTERNS.updateProfile, payload);
  }

  updateRegistrationType(payload: UpdateShopRegistrationTypeMessage) {
    return this.send(SHOPS_MESSAGE_PATTERNS.updateRegistrationType, payload);
  }

  getBrandAuthorizationUploadSignatures(payload: BrandAuthorizationUploadSignaturesMessage) {
    return this.send(SHOPS_MESSAGE_PATTERNS.getBrandAuthorizationUploadSignatures, payload);
  }

  submitBrandAuthorization(payload: SubmitBrandAuthorizationMessage) {
    return this.send(SHOPS_MESSAGE_PATTERNS.submitBrandAuthorization, payload);
  }

  findBrandAuthorizations(payload: BrandAuthorizationsLookupMessage) {
    return this.send(SHOPS_MESSAGE_PATTERNS.findBrandAuthorizations, payload);
  }

  findAdminBrandAuthorizations(payload: AdminBrandAuthorizationsLookupMessage = {}) {
    return this.send(SHOPS_MESSAGE_PATTERNS.findAdminBrandAuthorizations, payload);
  }

  reviewBrandAuthorization(payload: ReviewBrandAuthorizationMessage) {
    return this.send(SHOPS_MESSAGE_PATTERNS.reviewBrandAuthorization, payload);
  }

  findById(payload: ShopLookupMessage) {
    return this.send(SHOPS_MESSAGE_PATTERNS.findById, payload);
  }

  findMine(payload: MyShopsLookupMessage) {
    return this.send(SHOPS_MESSAGE_PATTERNS.findMine, payload);
  }

  findPublic(payload: PublicShopsLookupMessage = {}) {
    return this.send(SHOPS_MESSAGE_PATTERNS.findPublic, payload);
  }

  findByOffer(payload: ShopByOfferLookupMessage) {
    return this.send(SHOPS_MESSAGE_PATTERNS.findByOffer, payload);
  }

  findCategoriesByShopId(payload: ShopCategoriesLookupMessage) {
    return this.send(SHOPS_MESSAGE_PATTERNS.findCategoriesByShopId, payload);
  }

  findPendingVerification(payload: PendingVerificationShopsLookupMessage = {}) {
    return this.send(SHOPS_MESSAGE_PATTERNS.findPendingVerification, payload);
  }

  getAdminVerificationDetail(payload: AdminShopVerificationDetailMessage) {
    return this.send(SHOPS_MESSAGE_PATTERNS.getAdminVerificationDetail, payload);
  }

  getAdminRegistrationDetail(payload: AdminShopRegistrationDetailMessage) {
    return this.send(SHOPS_MESSAGE_PATTERNS.getAdminRegistrationDetail, payload);
  }

  getAdminVerificationSummary(payload: AdminShopVerificationSummaryMessage = {}) {
    return this.send(SHOPS_MESSAGE_PATTERNS.getAdminVerificationSummary, payload);
  }

  getVerificationSummary(payload: ShopVerificationSummaryMessage) {
    return this.send(SHOPS_MESSAGE_PATTERNS.getVerificationSummary, payload);
  }

  findShopDocuments(payload: ShopDocumentsLookupMessage) {
    return this.send(SHOPS_MESSAGE_PATTERNS.findShopDocuments, payload);
  }

  findShopDocumentRequirements(payload: ShopDocumentRequirementsLookupMessage) {
    return this.send(SHOPS_MESSAGE_PATTERNS.findShopDocumentRequirements, payload);
  }

  getShopDocumentUploadSignatures(payload: ShopDocumentUploadSignaturesMessage) {
    return this.send(SHOPS_MESSAGE_PATTERNS.getShopDocumentUploadSignatures, payload);
  }

  submitShopDocuments(payload: SubmitShopDocumentsMessage) {
    return this.send(SHOPS_MESSAGE_PATTERNS.submitShopDocuments, payload);
  }

  reviewShopDocument(payload: ReviewShopDocumentMessage) {
    return this.send(SHOPS_MESSAGE_PATTERNS.reviewShopDocument, payload);
  }

  private async send<TResult>(pattern: string, payload: unknown): Promise<TResult> {
    try {
      return await measureServiceCall(() => lastValueFrom(this.catalogClient.send<TResult, unknown>(pattern, payload)));
    } catch (error) {
      throwHttpExceptionFromRpc(error);
    }
  }
}
