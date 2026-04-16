import { Module } from '@nestjs/common';
import { PrismaModule } from '@database/prisma/prisma.module';
import { MediaModule } from '@media';
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
} from './application/use-cases';
import { ShopsRepository } from './infrastructure/persistence/shops.repository';
import { ShopsRpcController } from './presentation/rpc/shops.rpc-controller';

@Module({
  imports: [PrismaModule, MediaModule],
  controllers: [ShopsRpcController],
  providers: [
    ShopsRepository,
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
  ],
  exports: [
    ShopsRepository,
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
  ],
})
export class ShopsModule {}
