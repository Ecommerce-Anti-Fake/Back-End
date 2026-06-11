import { Module } from '@nestjs/common';
import { GatewayProductsModule } from '../products/products.module';
import { ShippingController } from './shipping.controller';

@Module({
  imports: [GatewayProductsModule],
  controllers: [ShippingController],
})
export class GatewayShippingModule {}
