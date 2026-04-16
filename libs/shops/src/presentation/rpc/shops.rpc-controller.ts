import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SHOPS_MESSAGE_PATTERNS } from '@contracts';
import type {
  AdminShopVerificationDetailMessage,
  CategoryDocumentsLookupMessage,
  CategoryDocumentUploadSignaturesMessage,
  CreateShopMessage,
  MyShopsLookupMessage,
  PendingVerificationShopsLookupMessage,
  ReviewShopCategoryMessage,
  ReviewShopDocumentMessage,
  ShopDocumentsLookupMessage,
  ShopDocumentUploadSignaturesMessage,
  ShopLookupMessage,
  ShopVerificationSummaryMessage,
  SubmitCategoryDocumentsMessage,
  SubmitShopDocumentsMessage,
} from '@contracts';
import { throwRpcException } from '@common';
import {
  CreateShopUseCase,
  GetAdminShopVerificationDetailUseCase,
  GetCategoryDocumentUploadSignaturesUseCase,
  GetShopVerificationSummaryUseCase,
  GetShopDocumentUploadSignaturesUseCase,
  GetShopByIdUseCase,
  ListCategoryDocumentsUseCase,
  ListMyShopsUseCase,
  ListPendingVerificationShopsUseCase,
  ListShopDocumentsUseCase,
  ReviewShopCategoryUseCase,
  ReviewShopDocumentUseCase,
  SubmitCategoryDocumentsUseCase,
  SubmitShopDocumentsUseCase,
} from '../../application/use-cases';

@Controller()
export class ShopsRpcController {
  constructor(
    private readonly createShopUseCase: CreateShopUseCase,
    private readonly getAdminShopVerificationDetailUseCase: GetAdminShopVerificationDetailUseCase,
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
    private readonly listMyShopsUseCase: ListMyShopsUseCase,
  ) {}

  @MessagePattern(SHOPS_MESSAGE_PATTERNS.create)
  async create(@Payload() payload: CreateShopMessage) {
    try {
      return await this.createShopUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(SHOPS_MESSAGE_PATTERNS.findPendingVerification)
  async findPendingVerification(@Payload() _payload?: PendingVerificationShopsLookupMessage) {
    try {
      return await this.listPendingVerificationShopsUseCase.execute();
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
