import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayShopsModule } from '../shops/shops.module';
import { ShopController } from './shop.controller';

@Module({
  imports: [AuthGuardsModule, GatewayShopsModule],
  controllers: [ShopController],
})
export class GatewayShopModule {}
