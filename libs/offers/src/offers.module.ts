import { Module } from '@nestjs/common';
import { PrismaModule } from '@database/prisma/prisma.module';
import { MediaModule } from '@media';
import {
  AllocateOfferBatchesUseCase,
  CreateOfferUseCase,
  GetOfferByIdUseCase,
  ListOfferBatchLinksUseCase,
  ListOffersUseCase,
  UpdateOfferUseCase,
} from './application/use-cases';
import { OffersRepository } from './infrastructure/persistence/offers.repository';
import { OffersRpcController } from './presentation/rpc/offers.rpc-controller';

@Module({
  imports: [PrismaModule, MediaModule],
  controllers: [OffersRpcController],
  providers: [
    OffersRepository,
    CreateOfferUseCase,
    UpdateOfferUseCase,
    AllocateOfferBatchesUseCase,
    ListOfferBatchLinksUseCase,
    ListOffersUseCase,
    GetOfferByIdUseCase,
  ],
  exports: [
    OffersRepository,
    CreateOfferUseCase,
    UpdateOfferUseCase,
    AllocateOfferBatchesUseCase,
    ListOfferBatchLinksUseCase,
    ListOffersUseCase,
    GetOfferByIdUseCase,
  ],
})
export class OffersModule {}
