import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { GatewayAdminModule } from './modules/admin/admin.module';
import { GatewayAffiliateModule } from './modules/affiliate/affiliate.module';
import { GatewayAuthModule } from './modules/auth/auth.module';
import { GatewayDistributionModule } from './modules/distribution/distribution.module';
import { GatewayOrdersModule } from './modules/orders/orders.module';
import { GatewayProductsModule } from './modules/products/products.module';
import { GatewayShopsModule } from './modules/shops/shops.module';
import { GatewayUsersModule } from './modules/users/users.module';
import {
  HealthController,
  RateLimitGuard,
  RequestLoggingMiddleware,
  StructuredExceptionFilter,
} from './observability';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    GatewayAdminModule,
    GatewayAffiliateModule,
    GatewayDistributionModule,
    GatewayOrdersModule,
    GatewayProductsModule,
    GatewayShopsModule,
    GatewayUsersModule,
    GatewayAuthModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
    {
      provide: APP_FILTER,
      useClass: StructuredExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggingMiddleware).forRoutes('*');
  }
}
