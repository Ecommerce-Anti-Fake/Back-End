import { Module } from '@nestjs/common';
import { PrismaModule } from '@database/prisma/prisma.module';
import {
  CreateShopUseCase,
  GetShopByIdUseCase,
  ListMyShopsUseCase,
} from './application/use-cases';
import { ShopsRepository } from './infrastructure/persistence/shops.repository';
import { ShopsRpcController } from './presentation/rpc/shops.rpc-controller';

@Module({
  imports: [PrismaModule],
  controllers: [ShopsRpcController],
  providers: [
    ShopsRepository,
    CreateShopUseCase,
    GetShopByIdUseCase,
    ListMyShopsUseCase,
  ],
  exports: [
    ShopsRepository,
    CreateShopUseCase,
    GetShopByIdUseCase,
    ListMyShopsUseCase,
  ],
})
export class ShopsModule {}
