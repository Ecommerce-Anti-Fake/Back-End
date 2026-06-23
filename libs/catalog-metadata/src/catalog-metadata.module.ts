import { Module } from '@nestjs/common';
import { PrismaModule } from '@database/prisma/prisma.module';
import {
  CreateBrandUseCase,
  CreateCategoryUseCase,
  ListBrandsUseCase,
  ListCategoriesUseCase,
  ListShippingCarriersUseCase,
} from './application/use-cases';
import { CatalogMetadataRepository } from './infrastructure/persistence/catalog-metadata.repository';
import { CatalogMetadataRpcController } from './presentation/rpc/catalog-metadata.rpc-controller';

@Module({
  imports: [PrismaModule],
  controllers: [CatalogMetadataRpcController],
  providers: [
    CatalogMetadataRepository,
    ListBrandsUseCase,
    CreateBrandUseCase,
    ListCategoriesUseCase,
    CreateCategoryUseCase,
    ListShippingCarriersUseCase,
  ],
  exports: [
    CatalogMetadataRepository,
    ListBrandsUseCase,
    CreateBrandUseCase,
    ListCategoriesUseCase,
    CreateCategoryUseCase,
    ListShippingCarriersUseCase,
  ],
})
export class CatalogMetadataModule {}
