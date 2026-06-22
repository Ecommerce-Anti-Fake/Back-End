import { Module } from '@nestjs/common';
import { PrismaModule } from '@database/prisma/prisma.module';
import { MediaModule } from '@media';
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
} from './application/use-cases';
import { OfferAssetsRepository } from './infrastructure/persistence/offer-assets.repository';
import { OfferAssetsRpcController } from './presentation/rpc/offer-assets.rpc-controller';

@Module({
  imports: [PrismaModule, MediaModule],
  controllers: [OfferAssetsRpcController],
  providers: [
    OfferAssetsRepository,
    GetOfferMediaUploadSignaturesUseCase,
    AddOfferMediaBatchUseCase,
    ListOfferMediaUseCase,
    DeleteOfferMediaUseCase,
    SetOfferPrimaryMediaUseCase,
    GetOfferDocumentUploadSignaturesUseCase,
    AddOfferDocumentsBatchUseCase,
    ListOfferDocumentsUseCase,
    DeleteOfferDocumentUseCase,
  ],
  exports: [OfferAssetsRepository],
})
export class OfferAssetsModule {}
