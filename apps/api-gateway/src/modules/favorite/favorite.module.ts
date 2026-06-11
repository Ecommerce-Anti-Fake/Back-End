import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayProductsModule } from '../products/products.module';
import { FavoriteController } from './favorite.controller';

@Module({
  imports: [AuthGuardsModule, GatewayProductsModule],
  controllers: [FavoriteController],
})
export class GatewayFavoriteModule {}
