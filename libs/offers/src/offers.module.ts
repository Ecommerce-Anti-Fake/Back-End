import { Module } from '@nestjs/common';
import { PrismaModule } from '@database/prisma/prisma.module';
import { MediaModule } from '@media';
import {
  AllocateOfferBatchesUseCase,
  CreateOfferUseCase,
  GetBuyNowOfferPreviewUseCase,
  DeleteOfferVariantUseCase,
  GetOfferByIdUseCase,
  ListOfferBatchLinksUseCase,
  ListOffersUseCase,
  ListAdminOffersUseCase,
  ListOfferVariantsUseCase,
  UpdateOfferVariantUseCase,
  UpdateOfferUseCase,
  ModerateOfferUseCase,
} from './application/use-cases';
import { OffersRepository } from './infrastructure/persistence/offers.repository';
import { OffersRpcController } from './presentation/rpc/offers.rpc-controller';

@Module({
  imports: [PrismaModule, MediaModule],
  controllers: [OffersRpcController],
  providers: [
    OffersRepository,
    CreateOfferUseCase,
    ListOfferVariantsUseCase,
    UpdateOfferVariantUseCase,
    DeleteOfferVariantUseCase,
    UpdateOfferUseCase,
    ModerateOfferUseCase,
    AllocateOfferBatchesUseCase,
    ListOfferBatchLinksUseCase,
    ListOffersUseCase,
    ListAdminOffersUseCase,
    GetBuyNowOfferPreviewUseCase,
    GetOfferByIdUseCase,
  ],
  exports: [
    OffersRepository,
    CreateOfferUseCase,
    ListOfferVariantsUseCase,
    UpdateOfferVariantUseCase,
    DeleteOfferVariantUseCase,
    UpdateOfferUseCase,
    ModerateOfferUseCase,
    AllocateOfferBatchesUseCase,
    ListOfferBatchLinksUseCase,
    ListOffersUseCase,
    ListAdminOffersUseCase,
    GetBuyNowOfferPreviewUseCase,
    GetOfferByIdUseCase,
  ],
})
export class OffersModule {}
