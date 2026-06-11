import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayShopModule } from '../shop/shop.module';
import { GatewayUserModule } from '../user/user.module';
import { VerificationController } from './verification.controller';

@Module({
  imports: [AuthGuardsModule, GatewayShopModule, GatewayUserModule],
  controllers: [VerificationController],
})
export class GatewayVerificationModule {}
