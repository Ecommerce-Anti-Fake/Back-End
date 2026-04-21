import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AffiliateModule } from '@affiliate/affiliate.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AffiliateModule,
  ],
})
export class AppModule {}
