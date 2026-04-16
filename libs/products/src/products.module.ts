import { Module } from '@nestjs/common';
import { PrismaModule } from '@database/prisma/prisma.module';
import { MediaModule } from '@media';
import {
  AddOfferDocumentsBatchUseCase,
  AddOfferMediaBatchUseCase,
  CreateOfferUseCase,
  GetOfferDocumentUploadSignaturesUseCase,
  GetOfferByIdUseCase,
  GetOfferMediaUploadSignaturesUseCase,
  GetProductModelByIdUseCase,
  ListOfferDocumentsUseCase,
  ListOfferMediaUseCase,
  ListOffersUseCase,
  ListProductModelsUseCase,
} from './application/use-cases';
import { ProductRepository } from './infrastructure/persistence/product-repository';
import { ProductsRpcController } from './presentation/rpc/products.rpc-controller';

@Module({
  imports: [PrismaModule, MediaModule],
  controllers: [ProductsRpcController],
  providers: [
    ProductRepository,
    ListProductModelsUseCase,
    GetProductModelByIdUseCase,
    CreateOfferUseCase,
    GetOfferMediaUploadSignaturesUseCase,
    AddOfferMediaBatchUseCase,
    ListOfferMediaUseCase,
    GetOfferDocumentUploadSignaturesUseCase,
    AddOfferDocumentsBatchUseCase,
    ListOfferDocumentsUseCase,
    ListOffersUseCase,
    GetOfferByIdUseCase,
  ],
  exports: [
    ProductRepository,
    ListProductModelsUseCase,
    GetProductModelByIdUseCase,
    CreateOfferUseCase,
    GetOfferMediaUploadSignaturesUseCase,
    AddOfferMediaBatchUseCase,
    ListOfferMediaUseCase,
    GetOfferDocumentUploadSignaturesUseCase,
    AddOfferDocumentsBatchUseCase,
    ListOfferDocumentsUseCase,
    ListOffersUseCase,
    GetOfferByIdUseCase,
  ],
})
export class ProductsModule {}
