import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayOfferModule } from '../offer/offer.module';
import { GatewayOrdersRpcModule } from '../order/orders-rpc.module';
import { OrderShippingController } from '../order-shipping/order-shipping.controller';
import { GatewayUserModule } from '../user/user.module';
import { ShippingController } from './shipping.controller';

@Module({
  imports: [AuthGuardsModule, GatewayOfferModule, GatewayOrdersRpcModule, GatewayUserModule],
  controllers: [ShippingController, OrderShippingController],
})
export class GatewayShippingModule {}
