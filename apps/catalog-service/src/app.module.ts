import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@database/prisma/prisma.module';
import { DistributionModule } from '@distribution/distribution.module';
import { ProductsModule } from '@products/products.module';
import { ShopsModule } from '@shops/shops.module';
import { ChatModule } from '@chat/chat.module';
import { SocialModule } from '@social/social.module';
import { LiveCommerceModule } from '@live-commerce/live-commerce.module';
import { ReviewsModule } from '@reviews/reviews.module';
import { OfferAssetsModule } from '@offer-assets/offer-assets.module';
import { FavoritesModule } from '@favorites/favorites.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    DistributionModule,
    ProductsModule,
    ChatModule,
    SocialModule,
    LiveCommerceModule,
    ReviewsModule,
    OfferAssetsModule,
    FavoritesModule,
    ShopsModule,
  ],
})
export class AppModule {}
