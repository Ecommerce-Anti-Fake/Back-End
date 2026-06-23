import { Module } from '@nestjs/common';
import { PrismaModule } from '@database/prisma/prisma.module';
import {
  AddFavoriteOfferUseCase,
  ListFavoriteOffersUseCase,
  RemoveFavoriteOfferUseCase,
} from './application/use-cases';
import { FavoritesRepository } from './infrastructure/persistence/favorites.repository';
import { FavoritesRpcController } from './presentation/rpc/favorites.rpc-controller';

@Module({
  imports: [PrismaModule],
  controllers: [FavoritesRpcController],
  providers: [
    FavoritesRepository,
    ListFavoriteOffersUseCase,
    AddFavoriteOfferUseCase,
    RemoveFavoriteOfferUseCase,
  ],
  exports: [FavoritesRepository],
})
export class FavoritesModule {}
