import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayProductsModule } from '../products/products.module';
import { GatewayUsersModule } from '../users/users.module';
import { OfferController } from './offer.controller';

@Module({
  imports: [AuthGuardsModule, GatewayProductsModule, GatewayUsersModule],
  controllers: [OfferController],
})
export class GatewayOfferModule {}
