import { Module } from '@nestjs/common';
import { PrismaModule } from '@database/prisma/prisma.module';
import { MediaModule } from '@media';
import {
  AllocateOfferBatchesUseCase,
  CreateOfferUseCase,
  CreateOfferVariantUseCase,
  GetOfferByIdUseCase,
  ListOfferBatchLinksUseCase,
  ListOffersUseCase,
  ListAdminOffersUseCase,
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
    CreateOfferVariantUseCase,
    UpdateOfferUseCase,
    ModerateOfferUseCase,
    AllocateOfferBatchesUseCase,
    ListOfferBatchLinksUseCase,
    ListOffersUseCase,
    ListAdminOffersUseCase,
    GetOfferByIdUseCase,
  ],
  exports: [
    OffersRepository,
    CreateOfferUseCase,
    CreateOfferVariantUseCase,
    UpdateOfferUseCase,
    ModerateOfferUseCase,
    AllocateOfferBatchesUseCase,
    ListOfferBatchLinksUseCase,
    ListOffersUseCase,
    ListAdminOffersUseCase,
    GetOfferByIdUseCase,
  ],
})
export class OffersModule {}
