import { Module } from '@nestjs/common';
import { PrismaModule } from '@database/prisma/prisma.module';
import {
  AllocateOfferBatchesUseCase,
  CreateOfferUseCase,
  GetOfferByIdUseCase,
  ListOfferBatchLinksUseCase,
  ListOffersUseCase,
  UpdateOfferUseCase,
} from './application/use-cases';
import { ProductRepository } from './infrastructure/persistence/product-repository';
import { ProductsRpcController } from './presentation/rpc/products.rpc-controller';

@Module({
  imports: [PrismaModule],
  controllers: [ProductsRpcController],
  providers: [
    ProductRepository,
    CreateOfferUseCase,
    UpdateOfferUseCase,
    AllocateOfferBatchesUseCase,
    ListOfferBatchLinksUseCase,
    ListOffersUseCase,
    GetOfferByIdUseCase,
  ],
  exports: [
    ProductRepository,
    CreateOfferUseCase,
    UpdateOfferUseCase,
    AllocateOfferBatchesUseCase,
    ListOfferBatchLinksUseCase,
    ListOffersUseCase,
    GetOfferByIdUseCase,
  ],
})
export class ProductsModule {}
