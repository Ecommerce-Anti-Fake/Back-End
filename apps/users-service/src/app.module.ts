import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AffiliateModule } from '@affiliate/affiliate.module';
import { PrismaModule } from '@database/prisma/prisma.module';
import { DistributionModule } from '@distribution/distribution.module';
import { OrdersModule } from '@orders/orders.module';
import { ProductsModule } from '@products/products.module';
import { ShopsModule } from '@shops/shops.module';
import { UsersModule } from '@users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AffiliateModule,
    PrismaModule,
    DistributionModule,
    OrdersModule,
    ProductsModule,
    ShopsModule,
    UsersModule,
  ],
})
export class AppModule {}
