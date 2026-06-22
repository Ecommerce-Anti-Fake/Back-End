import { Module } from '@nestjs/common';
import { PrismaModule } from '@database/prisma/prisma.module';
import {
  AllocateOfferBatchesUseCase,
  AddFavoriteOfferUseCase,
  CreateBrandUseCase,
  CreateCategoryUseCase,
  CreateOfferUseCase,
  GetOfferByIdUseCase,
  ListFavoriteOffersUseCase,
  ListBrandsUseCase,
  ListCategoriesUseCase,
  ListOfferBatchLinksUseCase,
  ListOffersUseCase,
  ListShippingCarriersUseCase,
  RemoveFavoriteOfferUseCase,
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
    ListFavoriteOffersUseCase,
    AddFavoriteOfferUseCase,
    RemoveFavoriteOfferUseCase,
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
    ListFavoriteOffersUseCase,
    AddFavoriteOfferUseCase,
    RemoveFavoriteOfferUseCase,
  ],
})
export class ProductsModule {}
