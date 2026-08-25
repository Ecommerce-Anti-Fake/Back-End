import { Module } from '@nestjs/common';
import { PrismaModule } from '@database/prisma/prisma.module';
import { MediaModule } from '@media';
import {
  CreateBrandUseCase,
  CreateCategoryUseCase,
  ListBrandsUseCase,
  ListCategoriesUseCase,
  ListShippingCarriersUseCase,
  VerifyProductUseCase,
} from './application/use-cases';
import { CatalogMetadataRepository } from './infrastructure/persistence/catalog-metadata.repository';
import { CatalogMetadataRpcController } from './presentation/rpc/catalog-metadata.rpc-controller';

@Module({
  imports: [PrismaModule, MediaModule],
  controllers: [CatalogMetadataRpcController],
  providers: [
    CatalogMetadataRepository,
    ListBrandsUseCase,
    CreateBrandUseCase,
    ListCategoriesUseCase,
    CreateCategoryUseCase,
    ListShippingCarriersUseCase,
    VerifyProductUseCase,
  ],
  exports: [
    CatalogMetadataRepository,
    ListBrandsUseCase,
    CreateBrandUseCase,
    ListCategoriesUseCase,
    CreateCategoryUseCase,
    ListShippingCarriersUseCase,
    VerifyProductUseCase,
  ],
})
export class CatalogMetadataModule {}
