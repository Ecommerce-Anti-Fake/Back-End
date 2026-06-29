import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { GatewayAdminModule } from './modules/admin/admin.module';
import { GatewayAffiliateModule } from './modules/affiliate/affiliate.module';
import { GatewayAuthModule } from './modules/auth/auth.module';
import { GatewayAddressModule } from './modules/address/address.module';
import { GatewayBrandModule } from './modules/brand/brand.module';
import { GatewayCartModule } from './modules/cart/cart.module';
import { GatewayCategoryModule } from './modules/category/category.module';
import { GatewayDashboardModule } from './modules/dashboard/dashboard.module';
import { GatewayDistributionModule } from './modules/distribution/distribution.module';
import { GatewayFavoriteModule } from './modules/favorite/favorite.module';
import { GatewayKycModule } from './modules/kyc/kyc.module';
import { GatewayLiveModule } from './modules/live/live.module';
import { GatewayMediaModule } from './modules/media/media.module';
import { GatewayModerationModule } from './modules/moderation/moderation.module';
import { GatewayNotificationModule } from './modules/notification/notification.module';
import { GatewayOfferModule } from './modules/offer/offer.module';
import { GatewayOrderModule } from './modules/order/order.module';
import { GatewayPaymentModule } from './modules/payment/payment.module';
import { GatewayReviewModule } from './modules/review/review.module';
import { GatewayReportModule } from './modules/report/report.module';
import { GatewayRealtimeModule } from './modules/realtime/realtime.module';
import { GatewayShippingModule } from './modules/shipping/shipping.module';
import { GatewayShopModule } from './modules/shop/shop.module';
import { GatewayChatModule } from './modules/chat/chat.module';
import { GatewaySocialModule } from './modules/social/social.module';
import { GatewayUserModule } from './modules/user/user.module';
import { GatewayVerificationModule } from './modules/verification/verification.module';
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
    GatewayAddressModule,
    GatewayAffiliateModule,
    GatewayBrandModule,
    GatewayCartModule,
    GatewayCategoryModule,
    GatewayChatModule,
    GatewayDashboardModule,
    GatewayDistributionModule,
    GatewayFavoriteModule,
    GatewayKycModule,
    GatewayLiveModule,
    GatewayMediaModule,
    GatewayModerationModule,
    GatewayNotificationModule,
    GatewayOfferModule,
    GatewayOrderModule,
    GatewayPaymentModule,
    GatewayReviewModule,
    GatewayReportModule,
    GatewayRealtimeModule,
    GatewayShippingModule,
    GatewayShopModule,
    GatewaySocialModule,
    GatewayUserModule,
    GatewayVerificationModule,
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
