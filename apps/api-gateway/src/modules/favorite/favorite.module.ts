import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayOfferModule } from '../offer/offer.module';
import { FavoriteController } from './favorite.controller';

@Module({
  imports: [AuthGuardsModule, GatewayOfferModule],
  controllers: [FavoriteController],
})
export class GatewayFavoriteModule {}
