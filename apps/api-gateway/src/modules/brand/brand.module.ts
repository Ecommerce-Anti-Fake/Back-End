import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayProductsModule } from '../products/products.module';
import { GatewayShopsModule } from '../shops/shops.module';
import { BrandAuthorizationController } from './brand-authorization.controller';
import { BrandController } from './brand.controller';

@Module({
  imports: [AuthGuardsModule, GatewayProductsModule, GatewayShopsModule],
  controllers: [BrandController, BrandAuthorizationController],
})
export class GatewayBrandModule {}
