import { Module } from '@nestjs/common';
import { PrismaModule } from '@database/prisma/prisma.module';
import {
  CreateOfferUseCase,
  GetOfferByIdUseCase,
  GetProductModelByIdUseCase,
  ListOffersUseCase,
  ListProductModelsUseCase,
} from './application/use-cases';
import { ProductRepository } from './infrastructure/persistence/product-repository';
import { ProductsRpcController } from './presentation/rpc/products.rpc-controller';

@Module({
  imports: [PrismaModule],
  controllers: [ProductsRpcController],
  providers: [
    ProductRepository,
    ListProductModelsUseCase,
    GetProductModelByIdUseCase,
    CreateOfferUseCase,
    ListOffersUseCase,
    GetOfferByIdUseCase,
  ],
  exports: [
    ProductRepository,
    ListProductModelsUseCase,
    GetProductModelByIdUseCase,
    CreateOfferUseCase,
    ListOffersUseCase,
    GetOfferByIdUseCase,
  ],
})
export class ProductsModule {}
