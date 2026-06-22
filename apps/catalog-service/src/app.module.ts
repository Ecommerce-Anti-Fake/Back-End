import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@database/prisma/prisma.module';
import { DistributionModule } from '@distribution/distribution.module';
import { ProductsModule } from '@products/products.module';
import { ShopsModule } from '@shops/shops.module';
import { ChatModule } from '@chat/chat.module';
import { SocialModule } from '@social/social.module';

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
    ShopsModule,
  ],
})
export class AppModule {}
