import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GatewayAffiliateModule } from './modules/affiliate/affiliate.module';
import { GatewayAuthModule } from './modules/auth/auth.module';
import { GatewayDistributionModule } from './modules/distribution/distribution.module';
import { GatewayOrdersModule } from './modules/orders/orders.module';
import { GatewayProductsModule } from './modules/products/products.module';
import { GatewayShopsModule } from './modules/shops/shops.module';
import { GatewayUsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    GatewayAffiliateModule,
    GatewayDistributionModule,
    GatewayOrdersModule,
    GatewayProductsModule,
    GatewayShopsModule,
    GatewayUsersModule,
    GatewayAuthModule,
  ],
})
export class AppModule {}
