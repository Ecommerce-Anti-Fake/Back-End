import { Module } from '@nestjs/common';
import { GatewayOfferModule } from '../offer/offer.module';
import { ShippingController } from './shipping.controller';

@Module({
  imports: [GatewayOfferModule],
  controllers: [ShippingController],
})
export class GatewayShippingModule {}
