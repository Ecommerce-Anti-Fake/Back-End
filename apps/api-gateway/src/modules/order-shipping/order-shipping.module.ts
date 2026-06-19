import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayOrdersRpcModule } from '../order/orders-rpc.module';
import { GatewayUserModule } from '../user/user.module';
import { OrderShippingController } from './order-shipping.controller';

@Module({
  imports: [AuthGuardsModule, GatewayOrdersRpcModule, GatewayUserModule],
  controllers: [OrderShippingController],
})
export class GatewayOrderShippingModule {}
