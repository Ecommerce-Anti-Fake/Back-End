import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayOfferModule } from '../offer/offer.module';
import { GatewayUserModule } from '../user/user.module';
import { FavoriteController } from './favorite.controller';

@Module({
  imports: [AuthGuardsModule, GatewayOfferModule, GatewayUserModule],
  controllers: [FavoriteController],
})
export class GatewayFavoriteModule {}
