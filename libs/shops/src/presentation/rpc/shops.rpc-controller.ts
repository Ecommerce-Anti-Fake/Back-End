import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SHOPS_MESSAGE_PATTERNS } from '@contracts';
import type {
  AdminShopVerificationDetailMessage,
  AdminShopVerificationSummaryMessage,
  BrandAuthorizationUploadSignaturesMessage,
  BrandAuthorizationsLookupMessage,
  CategoryDocumentsLookupMessage,
  CategoryDocumentUploadSignaturesMessage,
  CreateShopMessage,
  MyShopsLookupMessage,
  PendingVerificationShopsLookupMessage,
  ReviewShopCategoryMessage,
  ReviewBrandAuthorizationMessage,
  ReviewShopDocumentMessage,
  ShopDocumentsLookupMessage,
  ShopDocumentUploadSignaturesMessage,
  ShopLookupMessage,
  ShopVerificationSummaryMessage,
  SubmitBrandAuthorizationMessage,
  SubmitCategoryDocumentsMessage,
  SubmitShopDocumentsMessage,
} from '@contracts';
import { throwRpcException } from '@common';
import {
  CreateShopUseCase,
  GetBrandAuthorizationUploadSignaturesUseCase,
  GetAdminShopVerificationDetailUseCase,
  GetAdminShopVerificationSummaryUseCase,
  GetCategoryDocumentUploadSignaturesUseCase,
  GetShopVerificationSummaryUseCase,
  GetShopDocumentUploadSignaturesUseCase,
  GetShopByIdUseCase,
  ListBrandAuthorizationsUseCase,
  ListCategoryDocumentsUseCase,
  ListMyShopsUseCase,
  ListPendingVerificationShopsUseCase,
  ListShopDocumentsUseCase,
  ReviewBrandAuthorizationUseCase,
  ReviewShopCategoryUseCase,
  ReviewShopDocumentUseCase,
  SubmitBrandAuthorizationUseCase,
  SubmitCategoryDocumentsUseCase,
  SubmitShopDocumentsUseCase,
} from '../../application/use-cases';

@Controller()
export class ShopsRpcController {
  constructor(
    private readonly createShopUseCase: CreateShopUseCase,
    private readonly getBrandAuthorizationUploadSignaturesUseCase: GetBrandAuthorizationUploadSignaturesUseCase,
    private readonly getAdminShopVerificationDetailUseCase: GetAdminShopVerificationDetailUseCase,
    private readonly getAdminShopVerificationSummaryUseCase: GetAdminShopVerificationSummaryUseCase,
    private readonly getShopVerificationSummaryUseCase: GetShopVerificationSummaryUseCase,
    private readonly listPendingVerificationShopsUseCase: ListPendingVerificationShopsUseCase,
    private readonly listShopDocumentsUseCase: ListShopDocumentsUseCase,
    private readonly listCategoryDocumentsUseCase: ListCategoryDocumentsUseCase,
    private readonly getShopDocumentUploadSignaturesUseCase: GetShopDocumentUploadSignaturesUseCase,
    private readonly submitShopDocumentsUseCase: SubmitShopDocumentsUseCase,
    private readonly getCategoryDocumentUploadSignaturesUseCase: GetCategoryDocumentUploadSignaturesUseCase,
    private readonly submitCategoryDocumentsUseCase: SubmitCategoryDocumentsUseCase,
    private readonly reviewShopDocumentUseCase: ReviewShopDocumentUseCase,
    private readonly reviewShopCategoryUseCase: ReviewShopCategoryUseCase,
    private readonly getShopByIdUseCase: GetShopByIdUseCase,
    private readonly listBrandAuthorizationsUseCase: ListBrandAuthorizationsUseCase,
    private readonly listMyShopsUseCase: ListMyShopsUseCase,
    private readonly submitBrandAuthorizationUseCase: SubmitBrandAuthorizationUseCase,
    private readonly reviewBrandAuthorizationUseCase: ReviewBrandAuthorizationUseCase,
  ) {}

  @MessagePattern(SHOPS_MESSAGE_PATTERNS.create)
  async create(@Payload() payload: CreateShopMessage) {
    try {
      return await this.createShopUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(SHOPS_MESSAGE_PATTERNS.getBrandAuthorizationUploadSignatures)
  async getBrandAuthorizationUploadSignatures(@Payload() payload: BrandAuthorizationUploadSignaturesMessage) {
    try {
      return await this.getBrandAuthorizationUploadSignaturesUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(SHOPS_MESSAGE_PATTERNS.submitBrandAuthorization)
  async submitBrandAuthorization(@Payload() payload: SubmitBrandAuthorizationMessage) {
    try {
      return await this.submitBrandAuthorizationUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(SHOPS_MESSAGE_PATTERNS.findBrandAuthorizations)
  async findBrandAuthorizations(@Payload() payload: BrandAuthorizationsLookupMessage) {
    try {
      return await this.listBrandAuthorizationsUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(SHOPS_MESSAGE_PATTERNS.reviewBrandAuthorization)
  async reviewBrandAuthorization(@Payload() payload: ReviewBrandAuthorizationMessage) {
    try {
      return await this.reviewBrandAuthorizationUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(SHOPS_MESSAGE_PATTERNS.findPendingVerification)
  async findPendingVerification(@Payload() payload?: PendingVerificationShopsLookupMessage) {
    try {
      return await this.listPendingVerificationShopsUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(SHOPS_MESSAGE_PATTERNS.getAdminVerificationSummary)
  async getAdminVerificationSummary(@Payload() _payload?: AdminShopVerificationSummaryMessage) {
    try {
      return await this.getAdminShopVerificationSummaryUseCase.execute();
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(SHOPS_MESSAGE_PATTERNS.getAdminVerificationDetail)
  async getAdminVerificationDetail(@Payload() payload: AdminShopVerificationDetailMessage) {
    try {
      return await this.getAdminShopVerificationDetailUseCase.execute(payload.shopId);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(SHOPS_MESSAGE_PATTERNS.getVerificationSummary)
  async getVerificationSummary(@Payload() payload: ShopVerificationSummaryMessage) {
    try {
      return await this.getShopVerificationSummaryUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(SHOPS_MESSAGE_PATTERNS.findShopDocuments)
  async findShopDocuments(@Payload() payload: ShopDocumentsLookupMessage) {
    try {
      return await this.listShopDocumentsUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(SHOPS_MESSAGE_PATTERNS.findCategoryDocuments)
  async findCategoryDocuments(@Payload() payload: CategoryDocumentsLookupMessage) {
    try {
      return await this.listCategoryDocumentsUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(SHOPS_MESSAGE_PATTERNS.getShopDocumentUploadSignatures)
  async getShopDocumentUploadSignatures(@Payload() payload: ShopDocumentUploadSignaturesMessage) {
    try {
      return await this.getShopDocumentUploadSignaturesUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(SHOPS_MESSAGE_PATTERNS.submitShopDocuments)
  async submitShopDocuments(@Payload() payload: SubmitShopDocumentsMessage) {
    try {
      return await this.submitShopDocumentsUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(SHOPS_MESSAGE_PATTERNS.getCategoryDocumentUploadSignatures)
  async getCategoryDocumentUploadSignatures(@Payload() payload: CategoryDocumentUploadSignaturesMessage) {
    try {
      return await this.getCategoryDocumentUploadSignaturesUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(SHOPS_MESSAGE_PATTERNS.submitCategoryDocuments)
  async submitCategoryDocuments(@Payload() payload: SubmitCategoryDocumentsMessage) {
    try {
      return await this.submitCategoryDocumentsUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(SHOPS_MESSAGE_PATTERNS.reviewShopDocument)
  async reviewShopDocument(@Payload() payload: ReviewShopDocumentMessage) {
    try {
      return await this.reviewShopDocumentUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(SHOPS_MESSAGE_PATTERNS.reviewShopCategory)
  async reviewShopCategory(@Payload() payload: ReviewShopCategoryMessage) {
    try {
      return await this.reviewShopCategoryUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(SHOPS_MESSAGE_PATTERNS.findById)
  async findById(@Payload() payload: ShopLookupMessage) {
    try {
      return await this.getShopByIdUseCase.execute(payload.id);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(SHOPS_MESSAGE_PATTERNS.findMine)
  async findMine(@Payload() payload: MyShopsLookupMessage) {
    try {
      return await this.listMyShopsUseCase.execute(payload.ownerUserId);
    } catch (error) {
      throwRpcException(error);
    }
  }
}
