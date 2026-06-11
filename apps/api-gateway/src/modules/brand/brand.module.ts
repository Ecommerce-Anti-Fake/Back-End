import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayOfferModule } from '../offer/offer.module';
import { GatewayShopModule } from '../shop/shop.module';
import { BrandAuthorizationController } from './brand-authorization.controller';
import { BrandController } from './brand.controller';

@Module({
  imports: [AuthGuardsModule, GatewayOfferModule, GatewayShopModule],
  controllers: [BrandController, BrandAuthorizationController],
})
export class GatewayBrandModule {}
