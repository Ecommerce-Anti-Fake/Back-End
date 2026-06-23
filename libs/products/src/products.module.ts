import { Module } from '@nestjs/common';
import { PrismaModule } from '@database/prisma/prisma.module';
import {
  AllocateOfferBatchesUseCase,
  CreateBrandUseCase,
  CreateCategoryUseCase,
  CreateOfferUseCase,
  GetOfferByIdUseCase,
  ListBrandsUseCase,
  ListCategoriesUseCase,
  ListOfferBatchLinksUseCase,
  ListOffersUseCase,
  ListShippingCarriersUseCase,
  UpdateOfferUseCase,
} from './application/use-cases';
import { ProductRepository } from './infrastructure/persistence/product-repository';
import { ProductsRpcController } from './presentation/rpc/products.rpc-controller';

@Module({
  imports: [PrismaModule],
  controllers: [ProductsRpcController],
  providers: [
    ProductRepository,
    ListBrandsUseCase,
    CreateBrandUseCase,
    ListCategoriesUseCase,
    CreateCategoryUseCase,
    ListShippingCarriersUseCase,
    CreateOfferUseCase,
    UpdateOfferUseCase,
    AllocateOfferBatchesUseCase,
    ListOfferBatchLinksUseCase,
    ListOffersUseCase,
    GetOfferByIdUseCase,
  ],
  exports: [
    ProductRepository,
    ListBrandsUseCase,
    CreateBrandUseCase,
    ListCategoriesUseCase,
    CreateCategoryUseCase,
    ListShippingCarriersUseCase,
    CreateOfferUseCase,
    UpdateOfferUseCase,
    AllocateOfferBatchesUseCase,
    ListOfferBatchLinksUseCase,
    ListOffersUseCase,
    GetOfferByIdUseCase,
  ],
})
export class ProductsModule {}
