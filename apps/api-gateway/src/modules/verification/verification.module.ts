import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayShopModule } from '../shop/shop.module';
import { VerificationController } from './verification.controller';

@Module({
  imports: [AuthGuardsModule, GatewayShopModule],
  controllers: [VerificationController],
})
export class GatewayVerificationModule {}
