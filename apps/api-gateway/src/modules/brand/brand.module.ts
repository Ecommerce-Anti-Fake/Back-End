import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayOfferModule } from '../offer/offer.module';
import { GatewayShopModule } from '../shop/shop.module';
import { GatewayUserModule } from '../user/user.module';
import { BrandController } from './brand.controller';

@Module({
  imports: [AuthGuardsModule, GatewayOfferModule, GatewayShopModule, GatewayUserModule],
  controllers: [BrandController],
})
export class GatewayBrandModule {}
